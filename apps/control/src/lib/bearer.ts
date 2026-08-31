import { timingSafeEqual } from "node:crypto"

export function hasBearerToken(request: Request, expected: string | undefined) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  return Boolean(expected) && expected!.length === supplied.length && timingSafeEqual(Buffer.from(expected!), Buffer.from(supplied))
}
