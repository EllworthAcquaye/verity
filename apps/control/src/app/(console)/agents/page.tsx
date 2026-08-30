import { BotIcon, BracesIcon, GaugeIcon, GitCompareArrowsIcon, ScanSearchIcon, ShieldCheckIcon, WaypointsIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const agents = [
  { name: "Contract Assertion Agent", icon: BracesIcon, mission: "Maps endpoint intent to status and JSON-path assertions.", operation: "assert.status · assert.json_path" },
  { name: "Replay Consistency Agent", icon: GitCompareArrowsIcon, mission: "Proves repeated requests do not multiply side effects.", operation: "assert.replay_equal" },
  { name: "Latency Sentinel", icon: GaugeIcon, mission: "Turns stated latency budgets into bounded evidence.", operation: "assert.latency" },
  { name: "Coverage Gap Detector", icon: ScanSearchIcon, mission: "Finds requirements without an executable check.", operation: "control-plane analysis" },
  { name: "Scope Guardian", icon: ShieldCheckIcon, mission: "Rejects targets and trust levels outside the approved job.", operation: "pre-execution policy" },
  { name: "Topology Mapper", icon: WaypointsIcon, mission: "Associates checks and later findings with registered services.", operation: "system graph mapping" },
]

export default function AgentsPage() {
  return <>
    <PageHeader eyebrow="Automation" title="AI Agents" icon={BotIcon} description="Six bounded capabilities over one declarative contract. These are inspectable strategies—not autonomous personas with arbitrary tools or self-granted permissions." />
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{agents.map((agent) => <Card key={agent.name}><CardHeader><div className="flex items-start justify-between"><div className="flex size-9 items-center justify-center rounded-lg bg-muted"><agent.icon className="size-4" /></div><Badge variant="outline">probe ceiling</Badge></div><CardTitle>{agent.name}</CardTitle><CardDescription>{agent.mission}</CardDescription><Badge variant="secondary" className="mt-2 font-mono">{agent.operation}</Badge></CardHeader></Card>)}</section>
    <Card className="border-dashed"><CardHeader><CardTitle>Shared governance contract</CardTitle><CardDescription>All generated checks begin with exactly one allowlisted HTTP request, contain observable assertions, target only the supplied base URL, and enter the library as drafts. Unknown operations and `mutate` trust fail validation before persistence.</CardDescription></CardHeader></Card>
  </>
}
