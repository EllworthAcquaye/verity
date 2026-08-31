import { createHash } from "node:crypto"

import { Prisma } from "@verity/data"

type AuditRecord = {
  actorId: string | null
  action: string
  subjectType: string
  subjectId: string
  payload: unknown
  previousHash: string | null
  hash: string
  at: Date
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonicalize(item)]))
  return value
}

function permutations<T>(items: T[]): T[][] {
  if (items.length < 2) return [items]
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]))
}

function payloadCandidates(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [payload]
  const entries = Object.entries(payload)
  if (entries.length > 6) return [canonicalize(payload)]
  return permutations(entries).map((candidate) => Object.fromEntries(candidate))
}

export function verifyAuditChain(events: AuditRecord[]) {
  let previousHash: string | null = null
  for (const event of events) {
    if (event.previousHash !== previousHash) return false
    const matches = payloadCandidates(event.payload).some((payload) => createHash("sha256").update(JSON.stringify({ actorId: event.actorId, action: event.action, subjectType: event.subjectType, subjectId: event.subjectId, payload, previousHash, at: event.at.toISOString() })).digest("hex") === event.hash)
    if (!matches) return false
    previousHash = event.hash
  }
  return true
}

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
  const canonicalPayload = canonicalize(payload) as Prisma.InputJsonValue
  const hash = createHash("sha256")
    .update(JSON.stringify({ actorId, action, subjectType, subjectId, payload: canonicalPayload, previousHash, at: at.toISOString() }))
    .digest("hex")
  await transaction.auditEvent.create({ data: { actorId, action, subjectType, subjectId, payload: canonicalPayload, previousHash, hash, at } })
}
