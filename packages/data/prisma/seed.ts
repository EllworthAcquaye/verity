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

  await prisma.dependency.upsert({
    where: {
      fromServiceId_toServiceId_kind: {
        fromServiceId: "service_checkout",
        toServiceId: "service_payment",
        kind: "sync-http",
      },
    },
    create: {
      id: "dependency_checkout_payment",
      fromServiceId: "service_checkout",
      toServiceId: "service_payment",
      kind: "sync-http",
      criticality: "critical",
    },
    update: { criticality: "critical" },
  })

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
        endpoint: { method: "POST", path: "/orders" },
        invariants: [
          "The same idempotency key creates at most one order",
          "A successful response includes an order id and accepted status",
        ],
        latencyBudgetMs: 750,
      },
    },
    update: {},
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
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exitCode = 1
  })
