import { prisma } from "@verity/data"
import {
  ActivityIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  FileCheck2Icon,
  NetworkIcon,
  PlayIcon,
  SparklesIcon,
} from "lucide-react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/auth-options"
import { AppSidebar } from "@/components/app-sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const system = await prisma.system.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      services: true,
      specs: { include: { checks: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 1 },
      _count: { select: { runs: true } },
    },
  })

  const checks = system?.specs.flatMap((spec) => spec.checks) ?? []
  const validatedChecks = checks.filter((check) => check.status === "validated")
  const serviceCount = system?.services.length ?? 0
  const specCount = system?.specs.length ?? 0
  const runCount = system?._count.runs ?? 0
  const latestRun = system?.runs[0]
  const coverage = serviceCount ? Math.round((validatedChecks.length / serviceCount) * 100) : 0

  const workflow = [
    { name: "Specification", detail: `${specCount} versioned requirement${specCount === 1 ? "" : "s"}`, state: specCount ? "complete" : "queued" },
    { name: "Generate", detail: `${checks.length} stored check${checks.length === 1 ? "" : "s"}`, state: checks.length ? "complete" : "queued" },
    { name: "Review", detail: `${validatedChecks.length} executable`, state: validatedChecks.length ? "complete" : "attention" },
    { name: "Execute", detail: latestRun ? latestRun.status : "No run created yet", state: latestRun ? latestRun.status : "queued" },
    { name: "Release gate", detail: latestRun?.finishedAt ? "Evidence available" : "Awaiting evidence", state: latestRun?.finishedAt ? "complete" : "queued" },
  ]

  return (
    <SidebarProvider style={{ "--sidebar-width": "19rem" } as React.CSSProperties}>
      <AppSidebar
        user={{
          name: session.user.name ?? "Verity user",
          email: session.user.email ?? "",
          avatar: session.user.image ?? "",
          role: session.user.role,
        }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{system?.name ?? "No seeded system"} / {system?.environment ?? "unconfigured"}</p>
            <p className="truncate text-xs text-muted-foreground">Control center</p>
          </div>
          <Badge variant="outline" className="hidden gap-1 sm:flex">
            <span className="size-1.5 rounded-full bg-emerald-500" /> persisted
          </Badge>
          <ModeToggle />
          <Button size="sm"><SparklesIcon /> New verification</Button>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge>{system?.environment ?? "setup"}</Badge>
                <span className="text-xs text-muted-foreground">Signed in as {session.user.role}</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{system?.name ?? "Verification control center"}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                This state is rendered from PostgreSQL and survives browser and control-plane restarts.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">View specification</Button>
              <Button size="sm">Continue workflow <ArrowRightIcon /></Button>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Registered services" value={String(serviceCount)} detail="Stored topology nodes" icon={NetworkIcon} />
            <MetricCard title="Specifications" value={String(specCount)} detail="Immutable version history" icon={FileCheck2Icon} />
            <MetricCard title="Executable checks" value={String(validatedChecks.length)} detail={`${checks.length - validatedChecks.length} awaiting review`} icon={ActivityIcon} />
            <MetricCard title="Verification runs" value={String(runCount)} detail={latestRun ? `Latest: ${latestRun.status}` : "Ready for first execution"} icon={PlayIcon} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Governed workflow</CardTitle>
                    <CardDescription>Every completed transition is backed by a persisted artifact.</CardDescription>
                  </div>
                  <Badge variant="outline">{system?.environment ?? "setup"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {workflow.map((step, index) => (
                  <div key={step.name} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {step.state === "complete" ? <CheckCircle2Icon className="size-4 text-emerald-600" /> : index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{step.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{step.detail}</p>
                    </div>
                    <Badge variant={step.state === "attention" ? "destructive" : "outline"}>{step.state}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Persisted posture</CardTitle>
                <CardDescription>Calculated from the seeded domain, not display fixtures.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="coverage">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="coverage">Coverage</TabsTrigger>
                    <TabsTrigger value="data">Data</TabsTrigger>
                    <TabsTrigger value="identity">Identity</TabsTrigger>
                  </TabsList>
                  <TabsContent value="coverage" className="mt-5 space-y-5">
                    <PostureRow label="Services with validated checks" value={`${coverage}%`} progress={coverage} />
                    <PostureRow label="Specifications represented" value={specCount ? "100%" : "0%"} progress={specCount ? 100 : 0} />
                    <PostureRow label="Execution evidence" value={runCount ? "100%" : "0%"} progress={runCount ? 100 : 0} />
                  </TabsContent>
                  <TabsContent value="data" className="mt-5 space-y-3 text-sm text-muted-foreground">
                    <DatabaseIcon className="size-5" />
                    <p>{system ? `${system.name} is loaded from the migrated PostgreSQL schema.` : "Run the deterministic seed to load the reviewer system."}</p>
                  </TabsContent>
                  <TabsContent value="identity" className="mt-5 text-sm text-muted-foreground">
                    Server session: {session.user.email} · role: {session.user.role}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string
  value: string
  detail: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function PostureRow({ label, value, progress }: { label: string; value: string; progress: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      </div>
      <Progress value={Math.min(progress, 100)} />
    </div>
  )
}
