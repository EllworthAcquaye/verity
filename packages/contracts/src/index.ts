import { z } from "zod"

const pathSchema = z.string().regex(/^\/[A-Za-z0-9_./{}-]*$/)

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
