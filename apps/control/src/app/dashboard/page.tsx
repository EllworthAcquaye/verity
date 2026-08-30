import {
  ActivityIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  Clock3Icon,
  ShieldCheckIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react"

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

const workflow = [
  { name: "Specification", detail: "Contract v7", state: "complete" },
  { name: "Generate", detail: "12 checks proposed", state: "complete" },
  { name: "Review", detail: "2 need approval", state: "attention" },
  { name: "Execute", detail: "Isolated runner", state: "queued" },
  { name: "Release gate", detail: "Awaiting evidence", state: "queued" },
]

export default function DashboardPage() {
  return (
    <SidebarProvider style={{ "--sidebar-width": "19rem" } as React.CSSProperties}>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Checkout API / staging</p>
            <p className="truncate text-xs text-muted-foreground">Control center</p>
          </div>
          <Badge variant="outline" className="hidden gap-1 sm:flex">
            <span className="size-1.5 rounded-full bg-emerald-500" /> local-first
          </Badge>
          <ModeToggle />
          <Button size="sm"><SparklesIcon /> New verification</Button>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge>Foundation preview</Badge>
                <span className="text-xs text-muted-foreground">Phase 0</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Verification control center</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                One governed path from a service specification to reproducible evidence and an approval-backed release decision.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">View audit trail</Button>
              <Button size="sm">Continue review <ArrowRightIcon /></Button>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Release confidence" value="86%" detail="+9 since previous run" icon={ShieldCheckIcon} />
            <MetricCard title="Coverage" value="42 / 48" detail="6 paths need checks" icon={ActivityIcon} />
            <MetricCard title="Review queue" value="2" detail="Human decision required" icon={TriangleAlertIcon} />
            <MetricCard title="Last execution" value="03:18" detail="12 checks · isolated runner" icon={Clock3Icon} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Governed workflow</CardTitle>
                    <CardDescription>Every transition produces an explicit, inspectable artifact.</CardDescription>
                  </div>
                  <Badge variant="outline">staging</Badge>
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
                <CardTitle>Quality posture</CardTitle>
                <CardDescription>Current release gate inputs.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="coverage">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="coverage">Coverage</TabsTrigger>
                    <TabsTrigger value="risk">Risk</TabsTrigger>
                    <TabsTrigger value="signals">Signals</TabsTrigger>
                  </TabsList>
                  <TabsContent value="coverage" className="mt-5 space-y-5">
                    <PostureRow label="Contract paths" value="88%" progress={88} />
                    <PostureRow label="Failure modes" value="71%" progress={71} />
                    <PostureRow label="Performance budgets" value="94%" progress={94} />
                  </TabsContent>
                  <TabsContent value="risk" className="mt-5 text-sm text-muted-foreground">
                    Two medium-risk findings await a human approval decision.
                  </TabsContent>
                  <TabsContent value="signals" className="mt-5 text-sm text-muted-foreground">
                    Runner health and evidence ingestion will connect in the next implementation phase.
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
      <Progress value={progress} />
    </div>
  )
}
