import { prisma } from "@verity/data"
import { FileCheck2Icon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function CoveragePage() {
  const system = await prisma.system.findFirst({ orderBy: { createdAt: "asc" }, include: { specs: { orderBy: [{ title: "asc" }, { version: "desc" }], include: { checks: true } }, services: true } })
  const specs = system?.specs ?? []
  const represented = specs.filter((spec) => spec.checks.some((check) => check.status === "validated")).length
  const coverage = specs.length ? Math.round((represented / specs.length) * 100) : 0
  return <>
    <PageHeader eyebrow="Quality" title="Coverage" icon={FileCheck2Icon} description="Requirement → check → executable-state traceability from persisted records. New specification versions appear here immediately and remain gaps until a candidate is approved." />
    <section className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardTitle>{coverage}%</CardTitle><CardDescription>Requirement versions covered</CardDescription></CardHeader><CardContent><Progress value={coverage} /></CardContent></Card><Card><CardHeader><CardTitle>{represented} / {specs.length}</CardTitle><CardDescription>Versions with an executable check</CardDescription></CardHeader></Card><Card><CardHeader><CardTitle>{system?.services.length ?? 0}</CardTitle><CardDescription>Registered topology nodes</CardDescription></CardHeader></Card></section>
    <Card><CardHeader><CardTitle>Traceability matrix</CardTitle><CardDescription>Draft and rejected checks remain visible but do not count toward executable coverage.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Requirement</TableHead><TableHead>Version</TableHead><TableHead>Candidate checks</TableHead><TableHead>Executable</TableHead><TableHead>Gap</TableHead></TableRow></TableHeader><TableBody>{specs.map((spec) => { const validated = spec.checks.filter((check) => check.status === "validated").length; return <TableRow key={spec.id}><TableCell className="font-medium">{spec.title}</TableCell><TableCell>v{spec.version}</TableCell><TableCell>{spec.checks.length}</TableCell><TableCell>{validated}</TableCell><TableCell><Badge variant={validated ? "outline" : "destructive"}>{validated ? "covered" : "needs check"}</Badge></TableCell></TableRow> })}</TableBody></Table></CardContent></Card>
  </>
}
