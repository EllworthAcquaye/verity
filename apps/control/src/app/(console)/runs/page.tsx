import { prisma } from "@verity/data"
import { canStartRun } from "@verity/domain"
import { PlayIcon, RotateCwIcon } from "lucide-react"
import { getServerSession } from "next-auth"
import Link from "next/link"

import { retryRunDispatch, startVerification } from "@/app/(console)/actions"
import { authOptions } from "@/auth-options"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function RunsPage() {
  const session = await getServerSession(authOptions)
  const canRun = Boolean(session?.user && canStartRun(session.user.role))
  const [runs, executable] = await Promise.all([
    prisma.run.findMany({ orderBy: [{ startedAt: "desc" }, { id: "desc" }], include: { system: true, _count: { select: { checkRuns: true } }, outbox: { orderBy: { createdAt: "desc" }, take: 1 } }, take: 30 }),
    prisma.check.count({ where: { status: "validated" } }),
  ])
  return <>
    <PageHeader eyebrow="Operate" title="Verification runs" icon={PlayIcon} description="Queue the approved suite through the transactional outbox, then watch the isolated runner stream persisted outcomes back to this console." actions={canRun ? <form action={startVerification}><Button type="submit" disabled={!executable}><PlayIcon />Run {executable} approved checks</Button></form> : null} />
    <section className="grid gap-3">{runs.length ? runs.map((run) => <Card key={run.id}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle><Link href={`/runs/${run.id}`} className="hover:underline">Run {run.id.slice(-8)}</Link></CardTitle><CardDescription>{run.system.name} · {run.trigger} · {run._count.checkRuns} checks</CardDescription></div><Badge variant={run.status === "failed" ? "destructive" : run.status === "completed" ? "default" : "secondary"}>{run.status}</Badge></div></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><span>{run.finishedAt ? `Finished ${run.finishedAt.toLocaleString()}` : run.startedAt ? `Started ${run.startedAt.toLocaleString()}` : "Persisted and awaiting relay"}</span>{run.status === "queued" && canRun ? <form action={retryRunDispatch}><input type="hidden" name="runId" value={run.id} /><Button size="sm" variant="outline"><RotateCwIcon />Retry dispatch</Button></form> : run.passRate !== null ? <span className="font-mono">{Math.round(run.passRate * 100)}% passed</span> : null}</CardContent></Card>) : <Card><CardHeader><CardTitle>No run history yet</CardTitle><CardDescription>Start the approved suite to create the first durable run and evidence chain.</CardDescription></CardHeader></Card>}</section>
  </>
}
