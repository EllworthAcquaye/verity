import { prisma } from "@verity/data"
import { canConfigureVerification } from "@verity/domain"
import { CheckIcon, LibraryIcon, ShieldAlertIcon, XIcon } from "lucide-react"
import { getServerSession } from "next-auth"

import { approveCheck, rejectCheck } from "@/app/(console)/actions"
import { authOptions } from "@/auth-options"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function TestLibraryPage() {
  const session = await getServerSession(authOptions)
  const canReview = Boolean(session?.user && canConfigureVerification(session.user.role))
  const checks = await prisma.check.findMany({ orderBy: { createdAt: "desc" }, include: { spec: true } })
  return <>
    <PageHeader eyebrow="Quality" title="Test Library" icon={LibraryIcon} description="Inspect authored and model-generated definitions before they enter the executable suite. Approval changes persisted status; it does not alter the immutable definition." />
    <div className="flex flex-wrap gap-2"><Badge variant="outline">{checks.length} total</Badge><Badge variant="outline">{checks.filter((check) => check.status === "validated").length} executable</Badge><Badge variant="outline">{checks.filter((check) => check.status === "draft").length} awaiting review</Badge></div>
    <section className="grid gap-4 xl:grid-cols-2">{checks.map((check) => {
      const definition = check.definition as { name?: string; trust_level?: string; target_base_url?: string; steps?: { operation?: string }[] }
      return <Card key={check.id}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{definition.name ?? "Untitled check"}</CardTitle><CardDescription>{check.spec.title} · v{check.spec.version} · {check.origin}</CardDescription></div><Badge variant={check.status === "rejected" ? "destructive" : check.status === "validated" ? "default" : "outline"}>{check.status}</Badge></div></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2"><Badge variant="secondary"><ShieldAlertIcon />{definition.trust_level ?? check.trustLevel}</Badge><Badge variant="secondary">{definition.steps?.length ?? 0} steps</Badge><Badge variant="outline">{check.pillar}</Badge><Badge variant="outline">{check.domain}</Badge></div><div className="rounded-lg bg-muted/60 p-3 font-mono text-xs text-muted-foreground"><p>{definition.target_base_url}</p>{definition.steps?.map((step, index) => <p key={index}>{index + 1}. {step.operation}</p>)}</div>{check.status === "draft" && canReview ? <div className="flex gap-2"><form action={approveCheck}><input type="hidden" name="checkId" value={check.id} /><Button type="submit" size="sm"><CheckIcon />Approve into suite</Button></form><form action={rejectCheck}><input type="hidden" name="checkId" value={check.id} /><Button type="submit" size="sm" variant="outline"><XIcon />Reject</Button></form></div> : null}</CardContent></Card>
    })}</section>
  </>
}
