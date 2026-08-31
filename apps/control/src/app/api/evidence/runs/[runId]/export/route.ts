import { createHmac } from "node:crypto"

import { prisma } from "@verity/data"
import { getServerSession } from "next-auth"

import { authOptions } from "@/auth-options"

export const runtime = "nodejs"

export async function GET(_: Request, context: { params: Promise<{ runId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return Response.json({ error: "unauthorized" }, { status: 401 })
  const { runId } = await context.params
  const run = await prisma.run.findUnique({ where: { id: runId }, include: { system: true, checkRuns: { include: { check: true, service: true, evidence: { orderBy: { capturedAt: "asc" } }, findings: true } } } })
  if (!run) return Response.json({ error: "not_found" }, { status: 404 })
  const payload = { schemaVersion: 1, exportedAt: new Date().toISOString(), run }
  const serialized = JSON.stringify(payload)
  const key = process.env.EVIDENCE_SIGNING_KEY
  if (!key) return Response.json({ error: "signing_not_configured" }, { status: 503 })
  const signature = createHmac("sha256", key).update(serialized).digest("hex")
  const bundle = JSON.stringify({ algorithm: "HMAC-SHA256", signature, payload }, null, 2)
  return new Response(bundle, { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="verity-evidence-${runId}.json"`, "cache-control": "no-store" } })
}
