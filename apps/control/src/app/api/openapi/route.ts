import { openApiDocument } from "@/lib/openapi"

export function GET() {
  return Response.json(openApiDocument, { headers: { "cache-control": "public, max-age=300" } })
}
