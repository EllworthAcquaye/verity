"use server"

import { createHash } from "node:crypto"

import { generatedCheckSetSchema, specificationInputSchema } from "@verity/contracts"
import { Prisma, prisma } from "@verity/data"
import { canConfigureVerification } from "@verity/domain"
import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"

import { authOptions } from "@/auth-options"

export type FormState = { status: "idle" | "success" | "error"; message: string }

async function requireConfigurator() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !canConfigureVerification(session.user.role)) throw new Error("This action requires the engineer or admin role.")
  return session.user
}

async function appendAudit(actorId: string, action: string, subjectType: string, subjectId: string, payload: Prisma.InputJsonValue) {
  const previous = await prisma.auditEvent.findFirst({ orderBy: { at: "desc" } })
  const at = new Date()
  const hash = createHash("sha256").update(JSON.stringify({ actorId, action, subjectType, subjectId, payload, previousHash: previous?.hash ?? null, at: at.toISOString() })).digest("hex")
  await prisma.auditEvent.create({ data: { actorId, action, subjectType, subjectId, payload, previousHash: previous?.hash, hash, at } })
}

export async function createSpecification(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireConfigurator()
    const parsed = specificationInputSchema.safeParse({
      title: formData.get("title"),
      endpoint: { method: formData.get("method"), path: formData.get("path") },
      invariants: String(formData.get("invariants") ?? "").split("\n").map((item) => item.trim()).filter(Boolean),
      latencyBudgetMs: Number(formData.get("latencyBudgetMs")),
    })
    if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid specification" }
    const system = await prisma.system.findFirst({ orderBy: { createdAt: "asc" } })
    if (!system) return { status: "error", message: "No registered application is available." }
    const latest = await prisma.spec.findFirst({ where: { systemId: system.id, title: parsed.data.title }, orderBy: { version: "desc" } })
    const spec = await prisma.spec.create({ data: { systemId: system.id, title: parsed.data.title, version: (latest?.version ?? 0) + 1, authorId: user.id, intent: parsed.data as Prisma.InputJsonValue } })
    await appendAudit(user.id, "specification.created", "Spec", spec.id, { title: spec.title, version: spec.version })
    revalidatePath("/specifications"); revalidatePath("/coverage"); revalidatePath("/studio"); revalidatePath("/dashboard")
    return { status: "success", message: `Saved ${spec.title} v${spec.version}.` }
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to save specification." }
  }
}

export async function generateChecks(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireConfigurator()
    const specId = String(formData.get("specId") ?? "")
    const provider = String(formData.get("provider") ?? "")
    if (!(["ollama", "cassette", "anthropic"] as const).includes(provider as "ollama" | "cassette" | "anthropic")) return { status: "error", message: "Unknown generation provider." }
    const spec = await prisma.spec.findUnique({ where: { id: specId }, include: { system: true } })
    if (!spec) return { status: "error", message: "Specification not found." }
    const intent = specificationInputSchema.safeParse(spec.intent)
    if (!intent.success) return { status: "error", message: "Stored specification does not match the current contract." }
    const requestBody = JSON.stringify({ specification_title: spec.title, specification_intent: JSON.stringify(intent.data), target_base_url: spec.system.baseUrl, known_paths: [intent.data.endpoint.path] })
    async function requestCandidate() {
      const response = await fetch(`${process.env.RUNNER_API_URL ?? "http://runner:8000"}/generate/${provider}`, { method: "POST", headers: { "content-type": "application/json" }, cache: "no-store", body: requestBody })
      if (!response.ok) throw new Error(`Runner rejected generation (${response.status}): ${(await response.text()).slice(0, 180)}`)
      const parsed = generatedCheckSetSchema.safeParse(await response.json())
      if (!parsed.success) throw new Error("Provider output failed the TypeScript contract boundary.")
      return parsed.data
    }
    const firstCandidate = await requestCandidate()
    const replayCandidate = await requestCandidate()
    if (JSON.stringify(firstCandidate) !== JSON.stringify(replayCandidate)) return { status: "error", message: "Candidate rejected: the provider produced different output for the identical governed request." }
    await prisma.$transaction(firstCandidate.checks.map((check) => prisma.check.create({ data: {
      specId: spec.id, pillar: "functional-reliability", domain: "orders", origin: "generated", trustLevel: check.trust_level,
      scope: { systemId: spec.systemId, environment: spec.system.environment } as Prisma.InputJsonValue,
      definition: JSON.parse(JSON.stringify(check)) as Prisma.InputJsonValue, status: "draft",
    } })))
    await appendAudit(user.id, "checks.generated", "Spec", spec.id, { provider, count: firstCandidate.checks.length, deterministicReplay: true })
    revalidatePath("/studio"); revalidatePath("/test-library"); revalidatePath("/coverage"); revalidatePath("/dashboard")
    return { status: "success", message: `Generated ${firstCandidate.checks.length} schema-valid draft check${firstCandidate.checks.length === 1 ? "" : "s"} with ${provider}; identical replay passed.` }
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Generation failed." }
  }
}

export async function approveCheck(formData: FormData) {
  const user = await requireConfigurator()
  const checkId = String(formData.get("checkId") ?? "")
  const check = await prisma.check.findUnique({ where: { id: checkId } })
  if (!check) throw new Error("Check not found")
  await prisma.check.update({ where: { id: check.id }, data: { status: "validated" } })
  await appendAudit(user.id, "check.validated", "Check", check.id, { previousStatus: check.status })
  revalidatePath("/test-library"); revalidatePath("/coverage"); revalidatePath("/dashboard")
}

export async function rejectCheck(formData: FormData) {
  const user = await requireConfigurator()
  const checkId = String(formData.get("checkId") ?? "")
  const check = await prisma.check.findUnique({ where: { id: checkId } })
  if (!check) throw new Error("Check not found")
  await prisma.check.update({ where: { id: check.id }, data: { status: "rejected" } })
  await appendAudit(user.id, "check.rejected", "Check", check.id, { previousStatus: check.status })
  revalidatePath("/test-library"); revalidatePath("/coverage"); revalidatePath("/dashboard")
}
