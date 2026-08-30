"use client"

import { ActivityIcon, CheckCircle2Icon, CircleXIcon, Clock3Icon, FileLock2Icon } from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { RunSnapshot } from "@/lib/run-snapshot"

export function RunLive({ initial }: { initial: RunSnapshot }) {
  const [run, setRun] = useState(initial)
  useEffect(() => {
    if (run.status === "completed" || run.status === "failed") return
    const events = new EventSource(`/api/runs/${run.id}/events`)
    events.addEventListener("snapshot", (event) => {
      const next = JSON.parse((event as MessageEvent).data) as RunSnapshot
      setRun(next)
      if (next.status === "completed" || next.status === "failed") events.close()
    })
    return () => events.close()
  }, [run.id, run.status])

  const terminal = run.checks.filter((check) => ["passed", "failed", "error"].includes(check.status)).length
  const progress = run.checks.length ? Math.round((terminal / run.checks.length) * 100) : 0
  return <div className="space-y-4">
    <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Run {run.id.slice(-8)}</CardTitle><CardDescription>{run.system.name} · {run.system.environment} · {run.trigger}</CardDescription></div><StatusBadge status={run.status} /></div></CardHeader><CardContent className="space-y-3"><div className="flex justify-between text-sm"><span>{terminal} of {run.checks.length} checks resolved</span><span className="font-mono text-muted-foreground">{progress}%</span></div><Progress value={progress} /><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><Badge variant="outline"><FileLock2Icon />{run.dispatched ? "Outbox relayed" : "Outbox pending"}</Badge>{run.startedAt ? <Badge variant="outline"><Clock3Icon />Started {new Date(run.startedAt).toLocaleTimeString()}</Badge> : null}{run.passRate !== null ? <Badge variant="outline">Pass rate {Math.round(run.passRate * 100)}%</Badge> : null}</div></CardContent></Card>
    <section className="grid gap-3 xl:grid-cols-2">{run.checks.map((check) => <Card key={check.id}><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{check.name}</CardTitle><CardDescription>{check.durationMs === null ? "Awaiting isolated runner" : `${check.durationMs} ms · ${check.evidence} immutable records`}</CardDescription></div><StatusBadge status={check.status} /></div></CardHeader>{check.findings ? <CardContent><p className="text-sm text-amber-700 dark:text-amber-300">{check.findings} finding opened from failed evidence.</p></CardContent> : null}</Card>)}</section>
  </div>
}

function StatusBadge({ status }: { status: string }) {
  const Icon = status === "passed" || status === "completed" ? CheckCircle2Icon : status === "failed" || status === "error" ? CircleXIcon : ActivityIcon
  return <Badge variant={status === "failed" || status === "error" ? "destructive" : status === "passed" || status === "completed" ? "default" : "secondary"}><Icon />{status}</Badge>
}
