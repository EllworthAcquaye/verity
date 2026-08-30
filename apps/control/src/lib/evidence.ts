import { createHash } from "node:crypto"

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, canonicalize(child)]))
  }
  return value
}

export function evidenceHash(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(canonicalize(payload))).digest("hex")
}

export function evidenceIsVerified(payload: unknown, expected: string) {
  return evidenceHash(payload) === expected
}
