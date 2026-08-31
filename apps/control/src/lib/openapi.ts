export const openApiDocument = {
  openapi: "3.1.0",
  info: { title: "Verity governed verification API", version: "0.4.0", description: "Bounded machine interfaces for CI dispatch, status gates, runner callbacks, and schedule ticks." },
  servers: [{ url: "http://localhost:3000" }],
  components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } },
  paths: {
    "/api/ci/runs": { post: { summary: "Queue an idempotent CI verification", security: [{ bearerAuth: [] }], parameters: [{ in: "header", name: "Idempotency-Key", required: true, schema: { type: "string", minLength: 8, maxLength: 128 } }], responses: { "202": { description: "Run queued" }, "200": { description: "Existing run returned" }, "401": { description: "Unauthorized" } } } },
    "/api/ci/runs/{runId}": { get: { summary: "Read CI gate status", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "runId", required: true, schema: { type: "string" } }, { in: "query", name: "minimumPassRate", schema: { type: "number", minimum: 0, maximum: 1, default: 0.2 } }], responses: { "200": { description: "Current run and gate conclusion" }, "404": { description: "CI run not found" } } } },
    "/api/internal/schedules/tick": { post: { summary: "Claim due schedules under a PostgreSQL advisory lock", security: [{ bearerAuth: [] }], responses: { "200": { description: "Due schedules dispatched" }, "401": { description: "Unauthorized" } } } },
    "/api/runner/results": { post: { summary: "Persist a complete authenticated runner result", security: [{ bearerAuth: [] }], responses: { "200": { description: "Result accepted idempotently" }, "409": { description: "Result scope or completeness mismatch" } } } },
    "/api/evidence/runs/{runId}/export": { get: { summary: "Download a signed evidence bundle for an authenticated console session", parameters: [{ in: "path", name: "runId", required: true, schema: { type: "string" } }], responses: { "200": { description: "HMAC-SHA256 signed JSON bundle" }, "401": { description: "Unauthorized" } } } },
  },
} as const
