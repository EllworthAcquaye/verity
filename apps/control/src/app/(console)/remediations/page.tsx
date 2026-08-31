import { prisma } from "@verity/data"
import { canApproveRemediation, canConfigureVerification } from "@verity/domain"
import { GitPullRequestArrowIcon, ShieldCheckIcon } from "lucide-react"
import { getServerSession } from "next-auth"
import Link from "next/link"

import { authOptions } from "@/auth-options"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { approveRemediation, proposeRemediation, rejectRemediation } from "../actions"

export default async function RemediationsPage() {
  const session = await getServerSession(authOptions)
  const canPropose = Boolean(session?.user && canConfigureVerification(session.user.role))
  const canApprove = Boolean(session?.user && canApproveRemediation(session.user.role))
  const [eligibleFindings, remediations] = await Promise.all([
    prisma.finding.findMany({
      where: { checkRun: { checkId: "check_order_idempotency" }, remediations: { none: { status: { in: ["proposed", "approved", "applied", "verified"] } } } },
      include: { checkRun: { include: { check: true } } },
      orderBy: { checkRun: { run: { finishedAt: "desc" } } },
      take: 5,
    }),
    prisma.remediation.findMany({
      include: {
        proposedBy: true,
        approvals: { include: { actor: true }, orderBy: { decidedAt: "asc" } },
        finding: { include: { checkRun: { include: { check: true } } } },
        verificationRun: true,
      },
      orderBy: { id: "desc" },
      take: 20,
    }),
  ])

  return <>
    <PageHeader eyebrow="Governance" title="Remediation control" icon={GitPullRequestArrowIcon} description="A fixed-file sandbox proposes the diff. A different role approves it, staging executes the original failing check, and only a passing verification promotes it." />
    <section className="grid gap-4 lg:grid-cols-3">
      {["Allowlisted proposal", "Independent approval", "Verify before promote"].map((gate, index) => <Card key={gate}><CardHeader><CardDescription>Gate {index + 1}</CardDescription><CardTitle className="text-base"><ShieldCheckIcon className="mr-2 inline size-4 text-emerald-500" />{gate}</CardTitle></CardHeader></Card>)}
    </section>

    {eligibleFindings.length > 0 && <section className="grid gap-3"><h2 className="text-lg font-semibold">Eligible findings</h2>{eligibleFindings.map((finding) => {
      const definition = finding.checkRun.check.definition as { name?: string }
      return <Card key={finding.id}><CardHeader><CardTitle>{definition.name ?? finding.title}</CardTitle><CardDescription>{finding.summary}</CardDescription></CardHeader><CardContent className="flex items-center justify-between gap-4"><Badge variant="destructive">{finding.status}</Badge>{canPropose ? <form action={proposeRemediation}><input type="hidden" name="findingId" value={finding.id} /><Button type="submit">Propose governed fix</Button></form> : <span className="text-sm text-muted-foreground">Engineer role required</span>}</CardContent></Card>
    })}</section>}

    <section className="grid gap-4"><h2 className="text-lg font-semibold">Change history</h2>{remediations.length ? remediations.map((remediation) => <Card id={remediation.id} key={remediation.id}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{(remediation.finding.checkRun.check.definition as { name?: string }).name ?? remediation.finding.title}</CardTitle><CardDescription>Proposed by {remediation.proposedBy.name} · finding {remediation.findingId.slice(-8)}</CardDescription></div><Badge variant={remediation.status === "verified" ? "default" : remediation.status === "rolled_back" || remediation.status === "rejected" ? "destructive" : "secondary"}>{remediation.status.replace("_", " ")}</Badge></div></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">{remediation.rationale}</p>
      <details className="rounded-lg border bg-muted/20 p-3"><summary className="cursor-pointer text-sm font-medium">Review bounded diff</summary><pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">{remediation.proposedDiff}</pre></details>
      {remediation.approvals.map((approval) => <p className="text-sm" key={approval.id}><Badge variant="outline">{approval.decision}</Badge> {approval.actor.name}: {approval.reason}</p>)}
      {remediation.verificationRun && <Link className="text-sm font-medium underline" href={`/runs/${remediation.verificationRun.id}`}>Open staging verification run</Link>}
      {remediation.status === "proposed" && canApprove && session?.user.id !== remediation.proposedById && <div className="grid gap-3 md:grid-cols-2"><form action={approveRemediation} className="flex gap-2"><input type="hidden" name="remediationId" value={remediation.id} /><Input name="reason" required minLength={3} placeholder="Approval reason" /><Button type="submit">Approve & verify</Button></form><form action={rejectRemediation} className="flex gap-2"><input type="hidden" name="remediationId" value={remediation.id} /><Input name="reason" required minLength={3} placeholder="Rejection reason" /><Button type="submit" variant="destructive">Reject</Button></form></div>}
    </CardContent></Card>) : <Card><CardHeader><CardTitle>No remediation proposals</CardTitle><CardDescription>Run the suite to surface the seeded idempotency finding.</CardDescription></CardHeader></Card>}</section>
  </>
}
