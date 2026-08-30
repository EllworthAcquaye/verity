import { createHash } from "node:crypto"

const baseUrl = process.env.REMEDIATOR_API_URL ?? "http://remediator:9000"
const token = process.env.REMEDIATOR_TOKEN ?? ""

export type RemediationProposal = {
  diff: string
  sha256: string
  rationale: string
  allowed_path: "apps/target/src/server.js"
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!token) throw new Error("The remediation boundary is not configured.")
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Remediation boundary rejected ${path} (${response.status}): ${(await response.text()).slice(0, 180)}`)
  return response.json() as Promise<T>
}

export async function getRemediationProposal() {
  const proposal = await request<RemediationProposal>("/proposal")
  if (proposal.allowed_path !== "apps/target/src/server.js") throw new Error("Proposal escaped the allowlisted file.")
  if (Buffer.byteLength(proposal.diff) > 8_192) throw new Error("Proposal exceeds the governed diff limit.")
  if (!proposal.diff.startsWith("--- a/apps/target/src/server.js\n+++ b/apps/target/src/server.js")) throw new Error("Proposal is not a bounded unified diff.")
  if (createHash("sha256").update(proposal.diff).digest("hex") !== proposal.sha256) throw new Error("Proposal integrity check failed.")
  return proposal
}

export function remediationDiffHash(diff: string) {
  return createHash("sha256").update(diff).digest("hex")
}

export async function stageRemediation(sha256: string) {
  return request<{ staged: true }>("/stage", { method: "POST", body: JSON.stringify({ sha256 }) })
}

export async function promoteRemediation(sha256: string) {
  return request<{ promoted: true }>("/promote", { method: "POST", body: JSON.stringify({ sha256 }) })
}

export async function rollbackRemediation() {
  return request<{ rolled_back: true }>("/rollback", { method: "POST", body: "{}" })
}
