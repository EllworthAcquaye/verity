"use server"

import { checkDefinitionSchema, generatedCheckSetSchema, specificationInputSchema, type RunJob } from "@verity/contracts"
import { Prisma, prisma } from "@verity/data"
import { canApproveRemediation, canConfigureVerification, canStartRun } from "@verity/domain"
import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { authOptions } from "@/auth-options"
import { appendAudit } from "@/lib/audit"
import { getRemediationProposal, remediationDiffHash, stageRemediation } from "@/lib/remediator"
import { relayRunOutbox } from "@/lib/run-queue"

export type FormState = { status: "idle" | "success" | "error"; message: string }

async function requireConfigurator() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !canConfigureVerification(session.user.role)) throw new Error("This action requires the engineer or admin role.")
  return session.user
}

async function requireApprover() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !canApproveRemediation(session.user.role)) throw new Error("This action requires the approver or admin role.")
  return session.user
}

export async function proposeRemediation(formData: FormData) {
  const user = await requireConfigurator()
  const findingId = String(formData.get("findingId") ?? "")
  const finding = await prisma.finding.findUnique({ where: { id: findingId }, include: { checkRun: true, remediations: true } })
  if (!finding || finding.checkRun.checkId !== "check_order_idempotency") throw new Error("Only the allowlisted idempotency finding is remediable in this demonstration.")
  if (finding.remediations.some((item) => item.status !== "rejected" && item.status !== "rolled_back")) throw new Error("This finding already has an active remediation.")
  const proposal = await getRemediationProposal()
  const remediation = await prisma.$transaction(async (transaction) => {
    const created = await transaction.remediation.create({ data: { findingId, proposedById: user.id, proposedDiff: proposal.diff, rationale: proposal.rationale } })
    await transaction.finding.update({ where: { id: findingId }, data: { status: "remediating" } })
    await appendAudit(transaction, user.id, "remediation.proposed", "Remediation", created.id, { findingId, allowedPath: proposal.allowed_path, sha256: proposal.sha256 })
    return created
  })
  revalidatePath("/remediations"); revalidatePath("/results")
  redirect(`/remediations#${remediation.id}`)
}

export async function approveRemediation(formData: FormData) {
  const user = await requireApprover()
  const remediationId = String(formData.get("remediationId") ?? "")
  const reason = String(formData.get("reason") ?? "").trim()
  if (reason.length < 3) throw new Error("An approval reason is required.")
  const remediation = await prisma.remediation.findUnique({
    where: { id: remediationId },
    include: { finding: { include: { checkRun: { include: { check: true, run: true } } } } },
  })
  if (!remediation || remediation.status !== "proposed") throw new Error("Only a proposed remediation can be approved.")
  if (remediation.proposedById === user.id) throw new Error("The proposer cannot approve their own change.")
  const definition = checkDefinitionSchema.parse(remediation.finding.checkRun.check.definition)
  const stagedDefinition = checkDefinitionSchema.parse({ ...definition, target_base_url: "http://target-staging:4000" })

  await prisma.$transaction(async (transaction) => {
    await transaction.approval.create({ data: { remediationId, actorId: user.id, decision: "approved", reason } })
    await transaction.remediation.update({ where: { id: remediationId }, data: { status: "approved" } })
    await appendAudit(transaction, user.id, "remediation.approved", "Remediation", remediationId, { reason })
  })

  const sha256 = remediationDiffHash(remediation.proposedDiff)
  await stageRemediation(sha256)
  const runId = await prisma.$transaction(async (transaction) => {
    const run = await transaction.run.create({ data: { systemId: remediation.finding.checkRun.run.systemId, trigger: "manual", status: "queued" } })
    const checkRun = await transaction.checkRun.create({ data: { runId: run.id, checkId: remediation.finding.checkRun.checkId, serviceId: remediation.finding.serviceId, status: "queued" } })
    const job: RunJob = { run_id: run.id, checks: [{ check_run_id: checkRun.id, check_id: remediation.finding.checkRun.checkId, service_id: remediation.finding.serviceId, definition: stagedDefinition }] }
    await transaction.outboxMessage.create({ data: { runId: run.id, topic: "verification.run.requested", payload: JSON.parse(JSON.stringify(job)) as Prisma.InputJsonValue } })
    await transaction.remediation.update({ where: { id: remediationId }, data: { status: "applied", verificationRunId: run.id } })
    await appendAudit(transaction, user.id, "remediation.staged", "Remediation", remediationId, { sha256, verificationRunId: run.id, target: "staging" })
    return run.id
  })
  await relayRunOutbox(runId)
  revalidatePath("/remediations"); revalidatePath("/runs"); revalidatePath("/results")
  redirect(`/runs/${runId}`)
}

export async function rejectRemediation(formData: FormData) {
  const user = await requireApprover()
  const remediationId = String(formData.get("remediationId") ?? "")
  const reason = String(formData.get("reason") ?? "").trim()
  if (reason.length < 3) throw new Error("A rejection reason is required.")
  const remediation = await prisma.remediation.findUnique({ where: { id: remediationId } })
  if (!remediation || remediation.status !== "proposed") throw new Error("Only a proposed remediation can be rejected.")
  await prisma.$transaction(async (transaction) => {
    await transaction.approval.create({ data: { remediationId, actorId: user.id, decision: "rejected", reason } })
    await transaction.remediation.update({ where: { id: remediationId }, data: { status: "rejected" } })
    await transaction.finding.update({ where: { id: remediation.findingId }, data: { status: "open" } })
    await appendAudit(transaction, user.id, "remediation.rejected", "Remediation", remediationId, { reason })
  })
  revalidatePath("/remediations"); revalidatePath("/results")
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
    await prisma.$transaction((transaction) => appendAudit(transaction, user.id, "specification.created", "Spec", spec.id, { title: spec.title, version: spec.version }))
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
    await prisma.$transaction((transaction) => appendAudit(transaction, user.id, "checks.generated", "Spec", spec.id, { provider, count: firstCandidate.checks.length, deterministicReplay: true }))
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
  await prisma.$transaction((transaction) => appendAudit(transaction, user.id, "check.validated", "Check", check.id, { previousStatus: check.status }))
  revalidatePath("/test-library"); revalidatePath("/coverage"); revalidatePath("/dashboard")
}

export async function rejectCheck(formData: FormData) {
  const user = await requireConfigurator()
  const checkId = String(formData.get("checkId") ?? "")
  const check = await prisma.check.findUnique({ where: { id: checkId } })
  if (!check) throw new Error("Check not found")
  await prisma.check.update({ where: { id: check.id }, data: { status: "rejected" } })
  await prisma.$transaction((transaction) => appendAudit(transaction, user.id, "check.rejected", "Check", check.id, { previousStatus: check.status }))
  revalidatePath("/test-library"); revalidatePath("/coverage"); revalidatePath("/dashboard")
}

export async function startVerification() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !canStartRun(session.user.role)) throw new Error("This action requires the engineer or admin role.")
  const system = await prisma.system.findFirst({
    orderBy: { createdAt: "asc" },
    include: { services: { orderBy: { name: "asc" } }, specs: { include: { checks: { where: { status: "validated" }, orderBy: { createdAt: "asc" } } } } },
  })
  if (!system) throw new Error("No registered application is available.")
  const defaultService = system.services.find((service) => service.kind === "api") ?? system.services[0]
  if (!defaultService) throw new Error("The application has no executable service boundary.")

  const checks = system.specs.flatMap((spec) => spec.checks).map((check) => {
    const parsed = checkDefinitionSchema.safeParse(check.definition)
    if (!parsed.success) return null
    const scope = typeof check.scope === "object" && check.scope !== null ? check.scope as Record<string, unknown> : {}
    const service = system.services.find((candidate) => candidate.id === scope.serviceId) ?? defaultService
    return { check, definition: parsed.data, serviceId: service.id }
  }).filter((check): check is NonNullable<typeof check> => check !== null)
  if (!checks.length) throw new Error("No validated, schema-valid checks are ready to execute.")

  const runId = await prisma.$transaction(async (transaction) => {
    const run = await transaction.run.create({ data: { systemId: system.id, trigger: "manual", status: "queued" } })
    const queuedChecks: RunJob["checks"] = []
    for (const item of checks) {
      const checkRun = await transaction.checkRun.create({ data: { runId: run.id, checkId: item.check.id, status: "queued", serviceId: item.serviceId } })
      queuedChecks.push({ check_run_id: checkRun.id, check_id: item.check.id, service_id: item.serviceId, definition: item.definition })
    }
    const job: RunJob = { run_id: run.id, checks: queuedChecks }
    await transaction.outboxMessage.create({ data: { runId: run.id, topic: "verification.run.requested", payload: JSON.parse(JSON.stringify(job)) as Prisma.InputJsonValue } })
    await appendAudit(transaction, session.user.id, "run.queued", "Run", run.id, { checks: queuedChecks.length, trigger: "manual" })
    return run.id
  })

  await relayRunOutbox(runId)
  revalidatePath("/runs")
  revalidatePath("/results")
  revalidatePath("/dashboard")
  redirect(`/runs/${runId}`)
}

export async function retryRunDispatch(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !canStartRun(session.user.role)) throw new Error("This action requires the engineer or admin role.")
  const runId = String(formData.get("runId") ?? "")
  const run = await prisma.run.findUnique({ where: { id: runId } })
  if (!run || run.status !== "queued") throw new Error("Only a queued run can be dispatched.")
  await relayRunOutbox(run.id)
  revalidatePath(`/runs/${run.id}`)
  revalidatePath("/runs")
}
