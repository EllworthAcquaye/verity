import { prisma } from "@verity/data"
import { NetworkIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { SystemGraph } from "@/components/system-graph"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SystemGraphPage() {
  const system = await prisma.system.findFirst({ orderBy: { createdAt: "asc" }, include: { services: { include: { outgoing: true } } } })
  const dependencies = system?.services.flatMap((service) => service.outgoing) ?? []
  return <>
    <PageHeader eyebrow="Platform" title="System Graph" icon={NetworkIcon} description="A persisted topology—not an image. Pan, zoom and inspect the service/dependency boundary used for check scope and later finding propagation." />
    <div className="flex flex-wrap gap-2"><Badge variant="outline">{system?.services.length ?? 0} nodes</Badge><Badge variant="outline">{dependencies.length} edges</Badge><Badge variant="outline">{system?.environment ?? "setup"}</Badge></div>
    <SystemGraph services={(system?.services ?? []).map(({ id, name, kind }) => ({ id, name, kind }))} dependencies={dependencies.map(({ id, fromServiceId, toServiceId, kind }) => ({ id, fromServiceId, toServiceId, kind }))} />
    <Card><CardHeader><CardTitle>Graph semantics</CardTitle><CardDescription>Solid edges are synchronous or storage dependencies; animated edges represent event flow. Phase 2 will overlay coverage and live finding state on these same node IDs.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{system?.services.map((service) => <Badge key={service.id} variant="secondary">{service.name} · {service.kind}</Badge>)}</CardContent></Card>
  </>
}
