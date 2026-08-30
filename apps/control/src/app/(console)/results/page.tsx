import { prisma } from "@verity/data"
import { FileCheck2Icon, FingerprintIcon, ShieldCheckIcon, ShieldXIcon } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { evidenceIsVerified } from "@/lib/evidence"

export default async function ResultsPage() {
  const results = await prisma.checkRun.findMany({
    where: { status: { in: ["passed", "failed", "error"] } },
    orderBy: { run: { finishedAt: "desc" } },
    include: { run: true, check: true, service: true, evidence: { orderBy: { capturedAt: "asc" } }, findings: true },
    take: 60,
  })
  return <>
    <PageHeader eyebrow="Evidence" title="Verification results" icon={FileCheck2Icon} description="Inspect redacted request, response, assertion and replay records. Each payload is canonicalized and SHA-256 hashed before persistence." />
    <section className="grid gap-4">{results.length ? results.map((result) => {
      const definition = result.check.definition as { name?: string }
      const verified = result.evidence.every((record) => evidenceIsVerified(record.payload, record.sha256))
      return <Card key={result.id}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle><Link href={`/runs/${result.runId}`} className="hover:underline">{definition.name ?? "Untitled check"}</Link></CardTitle><CardDescription>{result.service.name} · {result.durationMs ?? 0} ms · run {result.runId.slice(-8)}</CardDescription></div><Badge variant={result.status === "passed" ? "default" : "destructive"}>{result.status}</Badge></div></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2"><Badge variant="outline">{result.evidence.length} evidence records</Badge><Badge variant="outline">{result.findings.length} findings</Badge><Badge variant={verified ? "secondary" : "destructive"}>{verified ? <ShieldCheckIcon /> : <ShieldXIcon />}{verified ? "Hashes verified" : "Integrity failure"}</Badge></div><div className="grid gap-2">{result.evidence.map((record) => <details key={record.id} className="rounded-lg border bg-muted/20 p-3"><summary className="cursor-pointer text-sm font-medium"><span className="inline-flex items-center gap-2"><FingerprintIcon className="size-4" />{record.type}<code className="text-xs text-muted-foreground">{record.sha256.slice(0, 16)}…</code></span></summary><pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-background p-3 text-xs text-muted-foreground">{JSON.stringify(record.payload, null, 2)}</pre></details>)}</div></CardContent></Card>
    }) : <Card><CardHeader><CardTitle>No terminal results</CardTitle><CardDescription>Run the approved suite; persisted evidence will appear here.</CardDescription></CardHeader></Card>}</section>
  </>
}
