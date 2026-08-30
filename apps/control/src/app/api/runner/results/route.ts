import { timingSafeEqual } from "node:crypto"

import { runResultSchema } from "@verity/contracts"
import { Prisma, prisma } from "@verity/data"

import { appendAudit } from "@/lib/audit"
import { promoteRemediation, remediationDiffHash, rollbackRemediation } from "@/lib/remediator"

export const runtime = "nodejs"

function authorized(request: Request) {
  const expected = process.env.RUNNER_CALLBACK_TOKEN ?? ""
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!expected || expected.length !== supplied.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
}

async function finalizeRemediation(runId: string, passed: boolean) {
  const remediation = await prisma.remediation.findUnique({ where: { verificationRunId: runId } })
  if (!remediation || remediation.status !== "applied") return false
  const sha256 = remediationDiffHash(remediation.proposedDiff)
  if (passed) await promoteRemediation(sha256)
  else await rollbackRemediation()
  await prisma.$transaction(async (transaction) => {
    await transaction.remediation.update({ where: { id: remediation.id }, data: { status: passed ? "verified" : "rolled_back" } })
    await transaction.finding.update({ where: { id: remediation.findingId }, data: { status: passed ? "verified" : "open" } })
    await appendAudit(transaction, null, passed ? "remediation.promoted" : "remediation.rolled_back", "Remediation", remediation.id, { sha256, verificationRunId: runId, verificationPassed: passed })
  })
  return true
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
  if (run.status === "completed" || run.status === "failed") {
    await finalizeRemediation(run.id, run.passRate === 1)
    return Response.json({ accepted: true, duplicate: true })
  }

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

  const allPassed = parsed.data.results.every((result) => result.status === "passed")
  await finalizeRemediation(run.id, allPassed)

  return Response.json({ accepted: true, duplicate: false })
}
