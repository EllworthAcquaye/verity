import { prisma } from "@verity/data"
import { FingerprintIcon, ShieldCheckIcon, ShieldXIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { verifyAuditChain } from "@/lib/audit"

export default async function AuditPage() {
  const events = await prisma.auditEvent.findMany({ include: { actor: true }, orderBy: [{ at: "asc" }, { id: "asc" }] })
  const verified = verifyAuditChain(events)
  return <>
    <PageHeader eyebrow="Governance" title="Audit chain" icon={FingerprintIcon} description="Append-only events bind each actor, action, subject, payload and timestamp to the previous SHA-256 hash." />
    <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Chain integrity</CardTitle><CardDescription>{events.length} events checked from genesis to head.</CardDescription></div><Badge variant={verified ? "default" : "destructive"}>{verified ? <ShieldCheckIcon /> : <ShieldXIcon />}{verified ? "Cryptographically verified" : "Integrity failure"}</Badge></div></CardHeader></Card>
    <section className="grid gap-3">{events.slice().reverse().map((event) => <Card key={event.id}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-base">{event.action}</CardTitle><CardDescription>{event.actor?.name ?? "System"} · {event.subjectType} {event.subjectId.slice(-8)} · {event.at.toLocaleString("en-GH")}</CardDescription></div><Badge variant="outline">{event.hash.slice(0, 12)}…</Badge></div></CardHeader><CardContent><pre className="overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(event.payload, null, 2)}</pre></CardContent></Card>)}</section>
  </>
}
