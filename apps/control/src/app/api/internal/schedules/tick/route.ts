import { timingSafeEqual } from "node:crypto"

import { prisma } from "@verity/data"

import { relayRunOutbox } from "@/lib/run-queue"
import { nextOccurrence } from "@/lib/schedules"
import { createVerificationRun } from "@/lib/verification"

export const runtime = "nodejs"

function authorized(request: Request) {
  const expected = process.env.SCHEDULER_TOKEN ?? ""
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  return Boolean(expected) && expected.length === supplied.length && timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 })
  const runIds = await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('verity-schedule-tick'))`
    const now = new Date()
    const due = await transaction.schedule.findMany({ where: { enabled: true, nextRunAt: { lte: now } }, orderBy: { nextRunAt: "asc" }, take: 5 })
    const created: string[] = []
    for (const schedule of due) {
      await transaction.schedule.update({ where: { id: schedule.id }, data: { lastRunAt: now, nextRunAt: nextOccurrence(schedule.cron, now) } })
      created.push(await createVerificationRun(transaction, { systemId: schedule.systemId, trigger: "scheduled", actorId: null, scheduleId: schedule.id }))
    }
    return created
  })
  await Promise.all(runIds.map(relayRunOutbox))
  return Response.json({ triggered: runIds.length, runIds })
}
