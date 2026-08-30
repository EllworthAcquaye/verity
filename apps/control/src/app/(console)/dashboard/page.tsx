import { prisma } from "@verity/data"
import { ActivityIcon, CheckCircle2Icon, DatabaseIcon, FileCheck2Icon, NetworkIcon, PlayIcon } from "lucide-react"
import { getServerSession } from "next-auth"

import { authOptions } from "@/auth-options"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const system = await prisma.system.findFirst({ orderBy: { createdAt: "asc" }, include: { services: true, specs: { include: { checks: true } }, runs: { orderBy: { startedAt: "desc" }, take: 1 }, _count: { select: { runs: true } } } })
  const checks = system?.specs.flatMap((spec) => spec.checks) ?? []
  const validated = checks.filter((check) => check.status === "validated")
  const serviceCount = system?.services.length ?? 0
  const coverage = serviceCount ? Math.min(100, Math.round((validated.length / serviceCount) * 100)) : 0
  const latestRun = system?.runs[0]
  const workflow = [
    ["Specification", `${system?.specs.length ?? 0} versioned requirements`, Boolean(system?.specs.length)],
    ["Generate", `${checks.length} stored checks`, Boolean(checks.length)],
    ["Review", `${validated.length} executable`, Boolean(validated.length)],
    ["Execute", latestRun?.status ?? "No run created yet", Boolean(latestRun)],
    ["Release gate", latestRun?.finishedAt ? "Evidence available" : "Awaiting evidence", Boolean(latestRun?.finishedAt)],
  ] as const

  return <>
    <PageHeader eyebrow={system?.environment ?? "setup"} title={system?.name ?? "Verification control center"} description={`PostgreSQL-backed posture for ${session?.user.email ?? "the signed-in reviewer"}; all completed transitions resolve to stored artifacts.`} />
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="Registered services" value={String(serviceCount)} detail="Stored topology nodes" icon={NetworkIcon} />
      <MetricCard title="Specifications" value={String(system?.specs.length ?? 0)} detail="Immutable version history" icon={FileCheck2Icon} />
      <MetricCard title="Executable checks" value={String(validated.length)} detail={`${checks.length - validated.length} awaiting review`} icon={ActivityIcon} />
      <MetricCard title="Verification runs" value={String(system?._count.runs ?? 0)} detail={latestRun ? `Latest: ${latestRun.status}` : "Phase 2 execution boundary"} icon={PlayIcon} />
    </section>
    <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <Card><CardHeader><CardTitle>Governed workflow</CardTitle><CardDescription>Configuration and isolated execution are live; remediation remains the next governed boundary.</CardDescription></CardHeader><CardContent className="space-y-3">
        {workflow.map(([name, detail, complete], index) => <div key={name} className="flex items-center gap-3 rounded-lg border p-3"><div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs">{complete ? <CheckCircle2Icon className="size-4 text-emerald-600" /> : index + 1}</div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{name}</p><p className="truncate text-xs text-muted-foreground">{detail}</p></div><Badge variant="outline">{complete ? "complete" : "queued"}</Badge></div>)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Persisted posture</CardTitle><CardDescription>Calculated from stored topology, specifications and review state.</CardDescription></CardHeader><CardContent><Tabs defaultValue="coverage"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="coverage">Coverage</TabsTrigger><TabsTrigger value="data">Data</TabsTrigger></TabsList><TabsContent value="coverage" className="mt-5 space-y-5"><PostureRow label="Services with executable checks" value={`${coverage}%`} progress={coverage} /><PostureRow label="Requirements represented" value={system?.specs.length ? "100%" : "0%"} progress={system?.specs.length ? 100 : 0} /></TabsContent><TabsContent value="data" className="mt-5 space-y-3 text-sm text-muted-foreground"><DatabaseIcon className="size-5" /><p>{system ? `${system.name} is loaded from the migrated PostgreSQL domain.` : "Run the deterministic seed."}</p></TabsContent></Tabs></CardContent></Card>
    </section>
  </>
}

function MetricCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: React.ComponentType<{ className?: string }> }) {
  return <Card><CardHeader className="flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>
}

function PostureRow({ label, value, progress }: { label: string; value: string; progress: number }) {
  return <div className="space-y-2"><div className="flex justify-between text-sm"><span>{label}</span><span className="font-mono text-xs text-muted-foreground">{value}</span></div><Progress value={progress} /></div>
}
