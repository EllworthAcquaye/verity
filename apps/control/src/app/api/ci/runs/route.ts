import { prisma } from "@verity/data"

import { appendAudit } from "@/lib/audit"
import { hasBearerToken } from "@/lib/bearer"
import { relayRunOutbox } from "@/lib/run-queue"
import { createVerificationRun } from "@/lib/verification"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!hasBearerToken(request, process.env.CI_TRIGGER_TOKEN)) return Response.json({ error: "unauthorized" }, { status: 401 })
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? ""
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) return Response.json({ error: "invalid_idempotency_key" }, { status: 400 })

  const outcome = await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ci:' + idempotencyKey}))`
    const existing = await transaction.ciRequest.findUnique({ where: { idempotencyKey } })
    if (existing) return { runId: existing.runId, duplicate: true }
    const system = await transaction.system.findFirst({ orderBy: { createdAt: "asc" } })
    if (!system) throw new Error("No registered application is available.")
    const runId = await createVerificationRun(transaction, { systemId: system.id, trigger: "ci", actorId: null })
    await transaction.ciRequest.create({ data: { idempotencyKey, runId } })
    await appendAudit(transaction, null, "ci.run.triggered", "Run", runId, { idempotencyKey })
    return { runId, duplicate: false }
  })
  if (!outcome.duplicate) await relayRunOutbox(outcome.runId)
  return Response.json(outcome, { status: outcome.duplicate ? 200 : 202 })
}
