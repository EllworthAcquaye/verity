import { prisma } from "@verity/data"

export async function getRunSnapshot(runId: string) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      system: { select: { name: true, environment: true } },
      checkRuns: {
        orderBy: { id: "asc" },
        include: { check: { select: { definition: true } }, findings: { select: { id: true } }, evidence: { select: { id: true } } },
      },
      outbox: { select: { publishedAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  })
  if (!run) return null
  return {
    id: run.id,
    status: run.status,
    trigger: run.trigger,
    startedAt: run.startedAt?.toISOString() ?? null,
    finishedAt: run.finishedAt?.toISOString() ?? null,
    passRate: run.passRate,
    coverage: run.coverage,
    system: run.system,
    dispatched: Boolean(run.outbox[0]?.publishedAt),
    checks: run.checkRuns.map((checkRun) => ({
      id: checkRun.id,
      status: checkRun.status,
      durationMs: checkRun.durationMs,
      name: (checkRun.check.definition as { name?: string }).name ?? "Untitled check",
      findings: checkRun.findings.length,
      evidence: checkRun.evidence.length,
    })),
  }
}

export type RunSnapshot = NonNullable<Awaited<ReturnType<typeof getRunSnapshot>>>
