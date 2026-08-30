import { prisma } from "@verity/data"
import { BoxesIcon, KeyRoundIcon, NetworkIcon, ServerCogIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function ApplicationsPage() {
  const system = await prisma.system.findFirst({ orderBy: { createdAt: "asc" }, include: { services: { orderBy: { name: "asc" } }, _count: { select: { specs: true, runs: true } } } })
  return <>
    <PageHeader eyebrow="Platform" title="Applications" icon={BoxesIcon} description="The registered application boundary Verity is allowed to inspect. The embedded Orders target is a deterministic reviewer fixture, not the customer integration model." />
    <section className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader><ServerCogIcon className="size-5 text-muted-foreground" /><CardTitle>{system?.name ?? "No application"}</CardTitle><CardDescription>{system?.environment ?? "unconfigured"}</CardDescription></CardHeader><CardContent><code className="text-xs text-muted-foreground">{system?.baseUrl ?? "—"}</code></CardContent></Card>
      <Card><CardHeader><NetworkIcon className="size-5 text-muted-foreground" /><CardTitle>{system?.services.length ?? 0} services</CardTitle><CardDescription>{system?._count.specs ?? 0} specification versions · {system?._count.runs ?? 0} runs</CardDescription></CardHeader></Card>
      <Card><CardHeader><KeyRoundIcon className="size-5 text-muted-foreground" /><CardTitle>Credential reference</CardTitle><CardDescription>Demo target needs no secret. Production runners resolve encrypted references inside the customer boundary.</CardDescription></CardHeader></Card>
    </section>
    <Card><CardHeader><CardTitle>Registered services</CardTitle><CardDescription>Persisted service inventory used to scope checks and render the System Graph.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Service</TableHead><TableHead>Kind</TableHead><TableHead>Environment</TableHead><TableHead>Connection</TableHead></TableRow></TableHeader><TableBody>{system?.services.map((service) => <TableRow key={service.id}><TableCell className="font-medium">{service.name}</TableCell><TableCell><Badge variant="secondary">{service.kind}</Badge></TableCell><TableCell>{system.environment}</TableCell><TableCell><Badge variant="outline"><span className="size-1.5 rounded-full bg-emerald-500" /> reachable in fixture network</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    <Card className="border-dashed"><CardHeader><CardTitle>Production connection flow</CardTitle><CardDescription>Register endpoint → store encrypted credential reference → dispatch scoped job → customer-network runner calls allowlisted service → redacted typed evidence returns. Customer code does not live in Verity.</CardDescription></CardHeader></Card>
  </>
}
