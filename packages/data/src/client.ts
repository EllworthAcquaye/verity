import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "./generated/client.js"

function requiredDatabaseUrl() {
  return process.env.DATABASE_URL ?? "postgresql://verity:verity-local-only@localhost:55432/verity"
}

export function createPrismaClient(connectionString = requiredDatabaseUrl()) {
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { verityPrisma?: PrismaClient }

export const prisma = globalForPrisma.verityPrisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.verityPrisma = prisma
