import { checkDefinitionSchema, type RunJob } from "@verity/contracts"
import { Prisma, prisma } from "@verity/data"

import { appendAudit } from "@/lib/audit"
import { relayRunOutbox } from "@/lib/run-queue"

export async function createVerificationRun(
  transaction: Prisma.TransactionClient,
  options: { systemId: string; trigger: "manual" | "scheduled" | "ci"; actorId: string | null; scheduleId?: string },
) {
  const system = await transaction.system.findUnique({
    where: { id: options.systemId },
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

  const run = await transaction.run.create({ data: { systemId: system.id, trigger: options.trigger, status: "queued", scheduleId: options.scheduleId } })
  const queuedChecks: RunJob["checks"] = []
  for (const item of checks) {
    const checkRun = await transaction.checkRun.create({ data: { runId: run.id, checkId: item.check.id, status: "queued", serviceId: item.serviceId } })
    queuedChecks.push({ check_run_id: checkRun.id, check_id: item.check.id, service_id: item.serviceId, definition: item.definition })
  }
  const job: RunJob = { run_id: run.id, checks: queuedChecks }
  await transaction.outboxMessage.create({ data: { runId: run.id, topic: "verification.run.requested", payload: JSON.parse(JSON.stringify(job)) as Prisma.InputJsonValue } })
  await appendAudit(transaction, options.actorId, "run.queued", "Run", run.id, { checks: queuedChecks.length, trigger: options.trigger, ...(options.scheduleId ? { scheduleId: options.scheduleId } : {}) })
  return run.id
}

export async function queueVerification(options: { systemId: string; trigger: "manual" | "scheduled" | "ci"; actorId: string | null; scheduleId?: string }) {
  const runId = await prisma.$transaction((transaction) => createVerificationRun(transaction, options))
  await relayRunOutbox(runId)
  return runId
}
