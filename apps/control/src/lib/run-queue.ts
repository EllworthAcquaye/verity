import { prisma } from "@verity/data"
import { createClient, type RedisClientType } from "redis"

const STREAM = "verity:runs"
let client: RedisClientType | undefined

async function redisClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL ?? "redis://redis:6379" })
    client.on("error", (error) => console.error("Redis relay error", error))
  }
  if (!client.isOpen) await client.connect()
  return client
}

export async function relayRunOutbox(runId: string) {
  const message = await prisma.outboxMessage.findFirst({
    where: { runId, publishedAt: null },
    orderBy: { createdAt: "asc" },
  })
  if (!message) return { published: false as const }

  const redis = await redisClient()
  const streamId = await redis.xAdd(STREAM, "*", {
    outbox_id: message.id,
    run_id: runId,
    payload: JSON.stringify(message.payload),
  })
  await prisma.$transaction([
    prisma.outboxMessage.update({ where: { id: message.id }, data: { publishedAt: new Date() } }),
    prisma.run.update({ where: { id: runId }, data: { status: "running", startedAt: new Date() } }),
  ])
  return { published: true as const, streamId }
}
