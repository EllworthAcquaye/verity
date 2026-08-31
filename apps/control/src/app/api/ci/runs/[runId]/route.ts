import { prisma } from "@verity/data"

import { hasBearerToken } from "@/lib/bearer"

export const runtime = "nodejs"

export async function GET(request: Request, context: { params: Promise<{ runId: string }> }) {
  if (!hasBearerToken(request, process.env.CI_TRIGGER_TOKEN)) return Response.json({ error: "unauthorized" }, { status: 401 })
  const { runId } = await context.params
  const run = await prisma.run.findUnique({ where: { id: runId }, include: { _count: { select: { checkRuns: true } } } })
  if (!run || run.trigger !== "ci") return Response.json({ error: "not_found" }, { status: 404 })
  const requestedThreshold = Number(new URL(request.url).searchParams.get("minimumPassRate") ?? "0.2")
  const minimumPassRate = Number.isFinite(requestedThreshold) ? Math.min(1, Math.max(0, requestedThreshold)) : 0.2
  const terminal = run.status === "completed" || run.status === "failed"
  const conclusion = !terminal ? "pending" : run.status === "completed" && (run.passRate ?? 0) >= minimumPassRate ? "success" : "failure"
  return Response.json({ runId: run.id, status: run.status, conclusion, minimumPassRate, passRate: run.passRate, coverage: run.coverage, checks: run._count.checkRuns })
}
