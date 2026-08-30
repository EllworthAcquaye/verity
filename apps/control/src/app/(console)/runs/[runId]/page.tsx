import { notFound } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { RunLive } from "@/components/run-live"
import { getRunSnapshot } from "@/lib/run-snapshot"

export default async function RunDetailPage({ params }: PageProps<"/runs/[runId]">) {
  const { runId } = await params
  const run = await getRunSnapshot(runId)
  if (!run) notFound()
  return <><PageHeader eyebrow="Live execution" title="Governed run" description="Updates arrive over an authenticated server-sent event stream; every terminal state resolves to PostgreSQL evidence." /><RunLive initial={run} /></>
}
