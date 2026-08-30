import { createHash } from "node:crypto"

import { Prisma } from "@verity/data"

export async function appendAudit(
  transaction: Prisma.TransactionClient,
  actorId: string | null,
  action: string,
  subjectType: string,
  subjectId: string,
  payload: Prisma.InputJsonValue,
) {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('verity-audit-chain'))`
  const previous = await transaction.auditEvent.findFirst({ orderBy: [{ at: "desc" }, { id: "desc" }] })
  const at = new Date()
  const previousHash = previous?.hash ?? null
  const hash = createHash("sha256")
    .update(JSON.stringify({ actorId, action, subjectType, subjectId, payload, previousHash, at: at.toISOString() }))
    .digest("hex")
  await transaction.auditEvent.create({ data: { actorId, action, subjectType, subjectId, payload, previousHash, hash, at } })
}
