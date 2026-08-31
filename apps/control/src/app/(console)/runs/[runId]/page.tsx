import { DownloadIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { RunLive } from "@/components/run-live"
import { buttonVariants } from "@/components/ui/button"
import { getRunSnapshot } from "@/lib/run-snapshot"

export default async function RunDetailPage({ params }: PageProps<"/runs/[runId]">) {
  const { runId } = await params
  const run = await getRunSnapshot(runId)
  if (!run) notFound()
  return <><PageHeader eyebrow="Live execution" title="Governed run" description="Updates arrive over an authenticated server-sent event stream; every terminal state resolves to PostgreSQL evidence." /><div><Link href={`/api/evidence/runs/${runId}/export`} className={buttonVariants({ variant: "outline" })}><DownloadIcon /> Export signed evidence</Link></div><RunLive initial={run} /></>
}
