import { hash } from "bcryptjs"

import { prisma } from "../src/client.js"

const seededUsers = [
  { id: "user_viewer", email: "viewer@verity.local", name: "Verity Viewer", role: "viewer" as const },
  { id: "user_engineer", email: "engineer@verity.local", name: "Maya Engineer", role: "engineer" as const },
  { id: "user_approver", email: "approver@verity.local", name: "Kofi Approver", role: "approver" as const },
  { id: "user_admin", email: "admin@verity.local", name: "Ama Administrator", role: "admin" as const },
]

async function seed() {
  const passwordHash = await hash("Verity123!", 12)

  for (const user of seededUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, passwordHash },
      update: { name: user.name, role: user.role, passwordHash },
    })
  }

  const system = await prisma.system.upsert({
    where: { name_environment: { name: "Orders Platform", environment: "staging" } },
    create: {
      id: "system_orders_staging",
      name: "Orders Platform",
      environment: "staging",
      baseUrl: "http://target:4000",
    },
    update: { baseUrl: "http://target:4000" },
  })

  const services = [
    { id: "service_checkout", name: "Checkout API", kind: "api" as const },
    { id: "service_payment", name: "Payment Worker", kind: "worker" as const },
    { id: "service_orders_db", name: "Orders PostgreSQL", kind: "external" as const },
    { id: "service_events", name: "Order Events", kind: "queue" as const },
  ]

  for (const service of services) {
    await prisma.service.upsert({
      where: { systemId_name: { systemId: system.id, name: service.name } },
      create: { ...service, systemId: system.id },
      update: { kind: service.kind },
    })
  }

  const dependencies = [
    { id: "dependency_checkout_payment", fromServiceId: "service_checkout", toServiceId: "service_payment", kind: "sync-http", criticality: "critical" },
    { id: "dependency_checkout_db", fromServiceId: "service_checkout", toServiceId: "service_orders_db", kind: "postgres", criticality: "critical" },
    { id: "dependency_checkout_events", fromServiceId: "service_checkout", toServiceId: "service_events", kind: "event-publish", criticality: "high" },
    { id: "dependency_payment_events", fromServiceId: "service_payment", toServiceId: "service_events", kind: "event-consume", criticality: "high" },
  ]

  for (const dependency of dependencies) {
    await prisma.dependency.upsert({
      where: { fromServiceId_toServiceId_kind: { fromServiceId: dependency.fromServiceId, toServiceId: dependency.toServiceId, kind: dependency.kind } },
      create: dependency,
      update: { criticality: dependency.criticality },
    })
  }

  const spec = await prisma.spec.upsert({
    where: {
      systemId_title_version: {
        systemId: system.id,
        title: "Create order safely",
        version: 1,
      },
    },
    create: {
      id: "spec_create_order_v1",
      systemId: system.id,
      title: "Create order safely",
      version: 1,
      authorId: "user_engineer",
      intent: {
        title: "Create order safely",
        endpoint: { method: "POST", path: "/orders" },
        invariants: [
          "The same idempotency key creates at most one order",
          "A successful response includes an order id and accepted status",
        ],
        latencyBudgetMs: 750,
      },
    },
    update: { intent: { title: "Create order safely", endpoint: { method: "POST", path: "/orders" }, invariants: ["The same idempotency key creates at most one order", "A successful response includes an order id and accepted status"], latencyBudgetMs: 750 } },
  })

  await prisma.check.upsert({
    where: { id: "check_order_idempotency" },
    create: {
      id: "check_order_idempotency",
      specId: spec.id,
      pillar: "functional-reliability",
      domain: "orders",
      origin: "authored",
      trustLevel: "probe",
      scope: { serviceId: "service_checkout", environment: "staging" },
      definition: {
        name: "Retry applies the order once",
        trust_level: "probe",
        target_base_url: "http://target:4000",
        steps: [
          {
            operation: "http.request",
            method: "POST",
            path: "/orders",
            headers: { "Idempotency-Key": "verity-seeded-order" },
            body: { sku: "SKU-001", quantity: 1 },
          },
          { operation: "assert.status", expected: 201 },
          { operation: "assert.replay_equal", repetitions: 2, compare: "side_effect_count" },
        ],
      },
      status: "validated",
    },
    update: {
      status: "validated",
      definition: {
        name: "Retry applies the order once",
        trust_level: "probe",
        target_base_url: "http://target:4000",
        steps: [
          { operation: "http.request", method: "POST", path: "/orders", headers: { "Idempotency-Key": "verity-seeded-order" }, body: { sku: "SKU-001", quantity: 1 } },
          { operation: "assert.status", expected: 201 },
          { operation: "assert.replay_equal", repetitions: 2, compare: "side_effect_count" },
        ],
      },
    },
  })

  const paymentSpec = await prisma.spec.upsert({
    where: { systemId_title_version: { systemId: system.id, title: "Accept payment callbacks", version: 1 } },
    create: { id: "spec_payment_callback_v1", systemId: system.id, title: "Accept payment callbacks", version: 1, authorId: "user_engineer", intent: { title: "Accept payment callbacks", endpoint: { method: "POST", path: "/callbacks/payment" }, invariants: ["A configured callback accepts a valid payment event"], latencyBudgetMs: 900 } },
    update: { intent: { title: "Accept payment callbacks", endpoint: { method: "POST", path: "/callbacks/payment" }, invariants: ["A configured callback accepts a valid payment event"], latencyBudgetMs: 900 } },
  })

  const bankSpec = await prisma.spec.upsert({
    where: { systemId_title_version: { systemId: system.id, title: "Parse bank settlement payloads", version: 1 } },
    create: { id: "spec_bank_payload_v1", systemId: system.id, title: "Parse bank settlement payloads", version: 1, authorId: "user_engineer", intent: { title: "Parse bank settlement payloads", endpoint: { method: "POST", path: "/callbacks/bank" }, invariants: ["Caller field casing is accepted", "Accepted is true for a settled payment"], latencyBudgetMs: 500 } },
    update: {},
  })

  const burstSpec = await prisma.spec.upsert({
    where: { systemId_title_version: { systemId: system.id, title: "Bound login burst resources", version: 1 } },
    create: { id: "spec_login_burst_v1", systemId: system.id, title: "Bound login burst resources", version: 1, authorId: "user_engineer", intent: { title: "Bound login burst resources", endpoint: { method: "POST", path: "/sessions/burst" }, invariants: ["Burst work remains within the latency budget"], latencyBudgetMs: 150 } },
    update: {},
  })

  const errorSpec = await prisma.spec.upsert({
    where: { systemId_title_version: { systemId: system.id, title: "Use HTTP errors for invalid orders", version: 1 } },
    create: { id: "spec_order_errors_v1", systemId: system.id, title: "Use HTTP errors for invalid orders", version: 1, authorId: "user_engineer", intent: { title: "Use HTTP errors for invalid orders", endpoint: { method: "POST", path: "/orders/validate" }, invariants: ["Invalid quantities return HTTP 422"], latencyBudgetMs: 250 } },
    update: {},
  })

  const receiptSpec = await prisma.spec.upsert({
    where: { systemId_title_version: { systemId: system.id, title: "Render receipts within budget", version: 1 } },
    create: { id: "spec_receipt_latency_v1", systemId: system.id, title: "Render receipts within budget", version: 1, authorId: "user_engineer", intent: { title: "Render receipts within budget", endpoint: { method: "GET", path: "/orders/seeded/receipt" }, invariants: ["A receipt returns within 250 milliseconds"], latencyBudgetMs: 250 } },
    update: {},
  })

  const healthSpec = await prisma.spec.upsert({
    where: { systemId_title_version: { systemId: system.id, title: "Expose service health", version: 1 } },
    create: { id: "spec_service_health_v1", systemId: system.id, title: "Expose service health", version: 1, authorId: "user_engineer", intent: { title: "Expose service health", endpoint: { method: "GET", path: "/health" }, invariants: ["The service reports a healthy status", "The endpoint returns within 250 milliseconds"], latencyBudgetMs: 250 } },
    update: { intent: { title: "Expose service health", endpoint: { method: "GET", path: "/health" }, invariants: ["The service reports a healthy status", "The endpoint returns within 250 milliseconds"], latencyBudgetMs: 250 } },
  })

  const additionalChecks = [
    { id: "check_payment_config", specId: paymentSpec.id, name: "Configured payment callback accepts valid events", status: "validated" as const, origin: "authored" as const, trustLevel: "probe" as const, steps: [{ operation: "http.request", method: "POST", path: "/callbacks/payment", body: { orderId: "demo", paymentStatus: "SETTLED" } }, { operation: "assert.status", expected: 202 }] },
    { id: "check_bank_case", specId: bankSpec.id, name: "Bank caller casing is parsed", status: "validated" as const, origin: "authored" as const, trustLevel: "probe" as const, steps: [{ operation: "http.request", method: "POST", path: "/callbacks/bank", body: { orderId: "demo", paymentStatus: "SETTLED" } }, { operation: "assert.status", expected: 202 }, { operation: "assert.json_path", path: "$.accepted", comparator: "equals", expected: true }] },
    { id: "check_login_burst", specId: burstSpec.id, name: "Login burst remains resource bounded", status: "validated" as const, origin: "authored" as const, trustLevel: "probe" as const, steps: [{ operation: "http.request", method: "POST", path: "/sessions/burst", body: { attempts: 220 } }, { operation: "assert.status", expected: 202 }, { operation: "assert.latency", max_ms: 150 }] },
    { id: "check_order_error_status", specId: errorSpec.id, name: "Invalid order uses an error status", status: "validated" as const, origin: "authored" as const, trustLevel: "probe" as const, steps: [{ operation: "http.request", method: "POST", path: "/orders/validate", body: { quantity: 0 } }, { operation: "assert.status", expected: 422 }] },
    { id: "check_receipt_latency", specId: receiptSpec.id, name: "Receipt path stays within its budget", status: "validated" as const, origin: "authored" as const, trustLevel: "readonly" as const, steps: [{ operation: "http.request", method: "GET", path: "/orders/seeded/receipt" }, { operation: "assert.status", expected: 200 }, { operation: "assert.latency", max_ms: 250 }] },
    { id: "check_service_health", specId: healthSpec.id, name: "Orders service is healthy", status: "validated" as const, origin: "authored" as const, trustLevel: "readonly" as const, steps: [{ operation: "http.request", method: "GET", path: "/health" }, { operation: "assert.status", expected: 200 }, { operation: "assert.latency", max_ms: 250 }] },
  ]

  for (const check of additionalChecks) {
    await prisma.check.upsert({
      where: { id: check.id },
      create: { id: check.id, specId: check.specId, pillar: "functional-reliability", domain: "orders", origin: check.origin, trustLevel: check.trustLevel, scope: { serviceId: "service_checkout", environment: "staging" }, definition: { name: check.name, trust_level: check.trustLevel, target_base_url: "http://target:4000", steps: check.steps }, status: check.status },
      update: { specId: check.specId, origin: check.origin, trustLevel: check.trustLevel, scope: { serviceId: "service_checkout", environment: "staging" }, definition: { name: check.name, trust_level: check.trustLevel, target_base_url: "http://target:4000", steps: check.steps }, status: check.status },
    })
  }

  // Retire definitions from earlier seeded revisions without touching reviewer-authored checks.
  await prisma.check.updateMany({ where: { id: { in: ["check_order_shape", "check_order_latency", "check_payment_auth", "check_payment_replay"] } }, data: { status: "rejected" } })

  await prisma.schedule.upsert({
    where: { systemId_name: { systemId: system.id, name: "Release verification" } },
    create: { id: "schedule_release_verification", systemId: system.id, name: "Release verification", cron: "*/15 * * * *", enabled: false, nextRunAt: new Date(Date.now() + 15 * 60_000), createdById: "user_engineer" },
    update: { cron: "*/15 * * * *" },
  })
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exitCode = 1
  })
