import { compare } from "bcryptjs"

import { prisma } from "./client.js"

export { createPrismaClient, prisma } from "./client.js"
export * from "./generated/client.js"

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user || !(await compare(password, user.passwordHash))) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
}
