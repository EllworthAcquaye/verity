import { timingSafeEqual } from "node:crypto"

import { runResultSchema } from "@verity/contracts"
import { Prisma, prisma } from "@verity/data"

import { appendAudit } from "@/lib/audit"

export const runtime = "nodejs"

function authorized(request: Request) {
  const expected = process.env.RUNNER_CALLBACK_TOKEN ?? ""
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!expected || expected.length !== supplied.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 })
  const parsed = runResultSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_result", issues: parsed.error.issues }, { status: 400 })

  const run = await prisma.run.findUnique({ where: { id: parsed.data.run_id }, include: { checkRuns: true } })
  if (!run) return Response.json({ error: "run_not_found" }, { status: 404 })
  const expected = new Map(run.checkRuns.map((checkRun) => [checkRun.id, checkRun]))
  if (parsed.data.results.length !== expected.size) return Response.json({ error: "incomplete_result_set" }, { status: 409 })
  for (const result of parsed.data.results) {
    const checkRun = expected.get(result.check_run_id)
    if (!checkRun || checkRun.checkId !== result.check_id || checkRun.serviceId !== result.service_id) {
      return Response.json({ error: "result_scope_mismatch" }, { status: 409 })
    }
  }
  if (run.status === "completed" || run.status === "failed") return Response.json({ accepted: true, duplicate: true })

  await prisma.$transaction(async (transaction) => {
    for (const result of parsed.data.results) {
      const current = expected.get(result.check_run_id)!
      if (["passed", "failed", "error"].includes(current.status)) continue
      let findingId: string | undefined
      if (result.status !== "passed") {
        const finding = await transaction.finding.upsert({
          where: { checkRunId_title: { checkRunId: result.check_run_id, title: result.status === "error" ? "Check execution error" : "Verification assertion failed" } },
          create: {
            checkRunId: result.check_run_id,
            serviceId: result.service_id,
            severity: result.status === "error" ? "high" : "medium",
            title: result.status === "error" ? "Check execution error" : "Verification assertion failed",
            summary: result.error ?? "One or more governed assertions did not hold.",
          },
          update: {},
        })
        findingId = finding.id
      }
      await transaction.evidence.createMany({
        data: result.evidence.map((record) => ({
          checkRunId: result.check_run_id,
          findingId,
          type: record.evidence_type,
          payload: JSON.parse(JSON.stringify(record.payload)) as Prisma.InputJsonValue,
          sha256: record.sha256,
        })),
        skipDuplicates: true,
      })
      await transaction.checkRun.update({ where: { id: result.check_run_id }, data: { status: result.status, durationMs: result.duration_ms } })
    }

    const passed = parsed.data.results.filter((result) => result.status === "passed").length
    const errored = parsed.data.results.filter((result) => result.status === "error").length
    await transaction.run.update({
      where: { id: run.id },
      data: {
        status: errored === parsed.data.results.length ? "failed" : "completed",
        finishedAt: new Date(),
        passRate: passed / parsed.data.results.length,
        coverage: 1,
      },
    })
    await appendAudit(transaction, null, "run.completed", "Run", run.id, { checks: parsed.data.results.length, passed, errored })
  })

  return Response.json({ accepted: true, duplicate: false })
}
