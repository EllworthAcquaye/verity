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
    update: {},
  })

  const paymentSpec = await prisma.spec.upsert({
    where: { systemId_title_version: { systemId: system.id, title: "Accept payment callbacks", version: 1 } },
    create: { id: "spec_payment_callback_v1", systemId: system.id, title: "Accept payment callbacks", version: 1, authorId: "user_engineer", intent: { title: "Accept payment callbacks", endpoint: { method: "POST", path: "/payment-callback" }, invariants: ["Valid callbacks are authenticated", "Duplicate events are handled once"], latencyBudgetMs: 900 } },
    update: { intent: { title: "Accept payment callbacks", endpoint: { method: "POST", path: "/payment-callback" }, invariants: ["Valid callbacks are authenticated", "Duplicate events are handled once"], latencyBudgetMs: 900 } },
  })

  const healthSpec = await prisma.spec.upsert({
    where: { systemId_title_version: { systemId: system.id, title: "Expose service health", version: 1 } },
    create: { id: "spec_service_health_v1", systemId: system.id, title: "Expose service health", version: 1, authorId: "user_engineer", intent: { title: "Expose service health", endpoint: { method: "GET", path: "/health" }, invariants: ["The service reports a healthy status", "The endpoint returns within 250 milliseconds"], latencyBudgetMs: 250 } },
    update: { intent: { title: "Expose service health", endpoint: { method: "GET", path: "/health" }, invariants: ["The service reports a healthy status", "The endpoint returns within 250 milliseconds"], latencyBudgetMs: 250 } },
  })

  const additionalChecks = [
    { id: "check_order_shape", specId: spec.id, name: "Successful order exposes an identifier", status: "draft" as const, origin: "generated" as const, trustLevel: "probe" as const, steps: [{ operation: "http.request", method: "POST", path: "/orders", body: { sku: "SKU-002", quantity: 1 } }, { operation: "assert.status", expected: 201 }, { operation: "assert.json_path", path: "$.id", comparator: "exists" }] },
    { id: "check_order_latency", specId: spec.id, name: "Order creation stays within its budget", status: "draft" as const, origin: "generated" as const, trustLevel: "probe" as const, steps: [{ operation: "http.request", method: "POST", path: "/orders", body: { sku: "SKU-003", quantity: 1 } }, { operation: "assert.status", expected: 201 }, { operation: "assert.latency", max_ms: 750 }] },
    { id: "check_payment_auth", specId: paymentSpec.id, name: "Payment callback requires authentication", status: "validated" as const, origin: "authored" as const, trustLevel: "probe" as const, steps: [{ operation: "http.request", method: "POST", path: "/payment-callback", body: { orderId: "demo", status: "paid" } }, { operation: "assert.status", expected: 401 }] },
    { id: "check_payment_replay", specId: paymentSpec.id, name: "Duplicate payment event is handled once", status: "draft" as const, origin: "generated" as const, trustLevel: "probe" as const, steps: [{ operation: "http.request", method: "POST", path: "/payment-callback", headers: { "X-Event-Id": "verity-payment-1" }, body: { orderId: "demo", status: "paid" } }, { operation: "assert.status", expected: 202 }, { operation: "assert.replay_equal", repetitions: 2, compare: "side_effect_count" }] },
    { id: "check_service_health", specId: healthSpec.id, name: "Orders service is healthy", status: "validated" as const, origin: "authored" as const, trustLevel: "readonly" as const, steps: [{ operation: "http.request", method: "GET", path: "/health" }, { operation: "assert.status", expected: 200 }, { operation: "assert.latency", max_ms: 250 }] },
  ]

  for (const check of additionalChecks) {
    await prisma.check.upsert({
      where: { id: check.id },
      create: { id: check.id, specId: check.specId, pillar: "functional-reliability", domain: "orders", origin: check.origin, trustLevel: check.trustLevel, scope: { serviceId: "service_checkout", environment: "staging" }, definition: { name: check.name, trust_level: check.trustLevel, target_base_url: "http://target:4000", steps: check.steps }, status: check.status },
      update: {},
    })
  }
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exitCode = 1
  })
