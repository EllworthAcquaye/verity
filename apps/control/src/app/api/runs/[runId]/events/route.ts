import { getServerSession } from "next-auth"

import { authOptions } from "@/auth-options"
import { getRunSnapshot } from "@/lib/run-snapshot"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const encoder = new TextEncoder()

export async function GET(request: Request, context: { params: Promise<{ runId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return Response.json({ error: "unauthorized" }, { status: 401 })
  const { runId } = await context.params
  if (!(await getRunSnapshot(runId))) return Response.json({ error: "not_found" }, { status: 404 })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let last = ""
      while (!request.signal.aborted) {
        const snapshot = await getRunSnapshot(runId)
        if (!snapshot) break
        const serialized = JSON.stringify(snapshot)
        if (serialized !== last) {
          controller.enqueue(encoder.encode(`event: snapshot\ndata: ${serialized}\n\n`))
          last = serialized
        } else {
          controller.enqueue(encoder.encode(": keep-alive\n\n"))
        }
        if (snapshot.status === "completed" || snapshot.status === "failed") break
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      controller.close()
    },
  })
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" } })
}
