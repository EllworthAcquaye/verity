import { z } from "zod"

const pathSchema = z.string().regex(/^\/[A-Za-z0-9_./{}-]*$/)

export const specificationInputSchema = z.strictObject({
  title: z.string().trim().min(3).max(160),
  endpoint: z.strictObject({
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: pathSchema,
  }),
  invariants: z.array(z.string().trim().min(3).max(500)).min(1).max(12),
  latencyBudgetMs: z.number().int().positive().max(30_000),
})

export const checkStepSchema = z.discriminatedUnion("operation", [
  z.strictObject({
    operation: z.literal("http.request"),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: pathSchema,
    headers: z.record(z.string(), z.string()).default({}),
    body: z.record(z.string(), z.unknown()).nullable().default(null),
  }),
  z.strictObject({
    operation: z.literal("assert.status"),
    expected: z.number().int().min(100).max(599),
  }),
  z.strictObject({
    operation: z.literal("assert.json_path"),
    path: z.string().regex(/^\$([.][A-Za-z0-9_-]+)*$/),
    comparator: z.enum(["equals", "exists", "matches"]),
    expected: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  }),
  z.strictObject({
    operation: z.literal("assert.latency"),
    max_ms: z.number().int().positive().max(30_000),
  }),
  z.strictObject({
    operation: z.literal("assert.replay_equal"),
    repetitions: z.number().int().min(2).max(3).default(2),
    compare: z.enum(["status", "body", "side_effect_count"]),
  }),
])

export const checkDefinitionSchema = z.strictObject({
  name: z.string().min(3).max(120),
  trust_level: z.enum(["readonly", "probe"]),
  target_base_url: z.url(),
  steps: z.array(checkStepSchema).min(2).max(12),
}).superRefine((check, context) => {
  const requests = check.steps.filter((step) => step.operation === "http.request")
  const assertions = check.steps.filter((step) => step.operation !== "http.request")
  if (requests.length !== 1 || check.steps[0]?.operation !== "http.request") {
    context.addIssue({ code: "custom", message: "a check must begin with exactly one HTTP request", path: ["steps"] })
  }
  if (assertions.length === 0) {
    context.addIssue({ code: "custom", message: "a check must contain at least one assertion", path: ["steps"] })
  }
  if (check.trust_level === "readonly" && requests.some((step) => step.method !== "GET")) {
    context.addIssue({ code: "custom", message: "readonly checks may issue only GET requests", path: ["steps"] })
  }
})

export const generatedCheckSetSchema = z.strictObject({
  checks: z.array(checkDefinitionSchema).min(1).max(6),
})

export const generatedCheckSetJsonSchema = z.toJSONSchema(generatedCheckSetSchema, {
  target: "draft-2020-12",
})

export type CheckDefinition = z.infer<typeof checkDefinitionSchema>
export type GeneratedCheckSet = z.infer<typeof generatedCheckSetSchema>
export type SpecificationInput = z.infer<typeof specificationInputSchema>

export const runJobSchema = z.strictObject({
  run_id: z.string().min(1),
  checks: z.array(z.strictObject({
    check_run_id: z.string().min(1),
    check_id: z.string().min(1),
    service_id: z.string().min(1),
    definition: checkDefinitionSchema,
  })).min(1).max(100),
})

export const evidenceRecordSchema = z.strictObject({
  evidence_type: z.enum(["request", "response", "assertion", "trace", "diff"]),
  payload: z.record(z.string(), z.unknown()),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
})

export const runResultSchema = z.strictObject({
  run_id: z.string().min(1),
  results: z.array(z.strictObject({
    check_run_id: z.string().min(1),
    check_id: z.string().min(1),
    service_id: z.string().min(1),
    status: z.enum(["passed", "failed", "error"]),
    duration_ms: z.number().int().nonnegative(),
    error: z.string().max(2_000).nullable().default(null),
    evidence: z.array(evidenceRecordSchema).min(1).max(50),
  })).min(1).max(100),
})

export type RunJob = z.infer<typeof runJobSchema>
export type RunResult = z.infer<typeof runResultSchema>
