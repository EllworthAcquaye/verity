import { prisma } from "@verity/data"
import { canConfigureVerification } from "@verity/domain"
import { FileCogIcon } from "lucide-react"
import { getServerSession } from "next-auth"

import { authOptions } from "@/auth-options"
import { PageHeader } from "@/components/page-header"
import { SpecificationForm } from "@/components/specification-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function SpecificationsPage() {
  const session = await getServerSession(authOptions)
  const canEdit = Boolean(session?.user && canConfigureVerification(session.user.role))
  const specs = await prisma.spec.findMany({ orderBy: [{ createdAt: "desc" }, { version: "desc" }], include: { author: true, checks: true } })
  return <>
    <PageHeader eyebrow="Quality" title="Specifications" icon={FileCogIcon} description="Turn human verification intent into immutable, structured versions. Endpoint, invariants and latency budgets remain inspectable before any model sees them." />
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.8fr)]">
      <Card><CardHeader><CardTitle>Version history</CardTitle><CardDescription>Creating the same title adds a new version; prior intent is never overwritten.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Requirement</TableHead><TableHead>Version</TableHead><TableHead>Checks</TableHead><TableHead>Author</TableHead></TableRow></TableHeader><TableBody>{specs.map((spec) => <TableRow key={spec.id}><TableCell><p className="font-medium">{spec.title}</p><p className="max-w-md truncate font-mono text-xs text-muted-foreground">{JSON.stringify(spec.intent)}</p></TableCell><TableCell><Badge variant="outline">v{spec.version}</Badge></TableCell><TableCell>{spec.checks.length}</TableCell><TableCell className="text-muted-foreground">{spec.author.name}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle>New specification version</CardTitle><CardDescription>{canEdit ? "Validated on the server and written with your identity." : "Sign in as engineer or admin to configure verification."}</CardDescription></CardHeader><CardContent><SpecificationForm disabled={!canEdit} /></CardContent></Card>
    </section>
  </>
}
