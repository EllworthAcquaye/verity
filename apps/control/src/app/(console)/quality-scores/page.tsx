import { prisma } from "@verity/data"
import { reliabilityScore } from "@verity/domain"
import { ActivityIcon, ShieldCheckIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function QualityScoresPage() {
  const system = await prisma.system.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      specs: { include: { checks: { where: { status: "validated" } } } },
      services: { orderBy: { name: "asc" }, include: { checkRuns: { where: { status: { in: ["passed", "failed", "error"] } }, orderBy: { run: { finishedAt: "desc" } }, take: 40, include: { findings: true } } } },
      runs: { where: { status: { in: ["completed", "failed"] } }, orderBy: { finishedAt: "desc" }, take: 12 },
    },
  })
  const checks = system?.specs.flatMap((spec) => spec.checks) ?? []
  const serviceScores = (system?.services ?? []).map((service) => {
    const coveredChecks = checks.filter((check) => (check.scope as { serviceId?: string }).serviceId === service.id).length
    const terminal = service.checkRuns
    const passed = terminal.filter((run) => run.status === "passed").length
    const critical = terminal.flatMap((run) => run.findings).filter((finding) => finding.severity === "critical" && finding.status !== "verified" && finding.status !== "accepted_risk").length
    const coverage = coveredChecks > 0 ? 1 : 0
    const passRate = terminal.length ? passed / terminal.length : 0
    return { ...service, coveredChecks, passRate, critical, score: reliabilityScore({ passRate, coverage, openCriticalFindings: critical }) }
  })
  const systemScore = serviceScores.length ? Math.round(serviceScores.reduce((sum, service) => sum + service.score, 0) / serviceScores.length) : 0
  const trends = (system?.runs ?? []).slice().reverse().map((run) => ({ ...run, score: reliabilityScore({ passRate: run.passRate ?? 0, coverage: run.coverage ?? 0, openCriticalFindings: 0 }) }))

  return <>
    <PageHeader eyebrow="Quality" title="Reliability scores" icon={ActivityIcon} description="A transparent posture score combines executed pass rate (55%), executable coverage (30%) and unresolved critical-finding health (15%)." />
    <section className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardDescription>System score</CardDescription><CardTitle className="text-4xl">{systemScore}</CardTitle></CardHeader><CardContent><Progress value={systemScore} /></CardContent></Card><Card><CardHeader><CardDescription>Services scored</CardDescription><CardTitle className="text-4xl">{serviceScores.length}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Completed trend points</CardDescription><CardTitle className="text-4xl">{trends.length}</CardTitle></CardHeader></Card></section>
    <Card><CardHeader><CardTitle>Service posture</CardTitle><CardDescription>Scores resolve from persisted checks, executions and findings—never a manually entered rating.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Service</TableHead><TableHead>Checks</TableHead><TableHead>Pass rate</TableHead><TableHead>Critical</TableHead><TableHead>Score</TableHead></TableRow></TableHeader><TableBody>{serviceScores.map((service) => <TableRow key={service.id}><TableCell className="font-medium">{service.name}</TableCell><TableCell>{service.coveredChecks}</TableCell><TableCell>{Math.round(service.passRate * 100)}%</TableCell><TableCell>{service.critical}</TableCell><TableCell><span className="inline-flex min-w-16 items-center gap-2"><ShieldCheckIcon className="size-4" /><strong>{service.score}</strong></span></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    <Card><CardHeader><CardTitle>Run trend</CardTitle><CardDescription>Oldest to newest; remediation verification appears as its own focused run.</CardDescription></CardHeader><CardContent className="space-y-3">{trends.length ? trends.map((run) => <div key={run.id} className="grid grid-cols-[5rem_1fr_auto] items-center gap-3"><Badge variant="outline">{run.id.slice(-6)}</Badge><Progress value={run.score} /><span className="font-mono text-sm">{run.score}</span></div>) : <p className="text-sm text-muted-foreground">No completed runs yet.</p>}</CardContent></Card>
  </>
}
