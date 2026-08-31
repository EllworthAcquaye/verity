import { BookOpenCheckIcon, ExternalLinkIcon, KeyRoundIcon } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const endpoints = [
  ["POST", "/api/ci/runs", "Idempotently queue the approved verification suite with trigger=ci."],
  ["GET", "/api/ci/runs/{runId}", "Poll run state and a configurable pass-rate gate conclusion."],
  ["POST", "/api/internal/schedules/tick", "Claim bounded due work under an advisory lock."],
  ["POST", "/api/runner/results", "Accept complete, scope-checked runner results over a signed boundary."],
  ["GET", "/api/evidence/runs/{runId}/export", "Download a session-authorized HMAC-signed evidence bundle."],
] as const

export default function ApiReferencePage() {
  return <>
    <PageHeader eyebrow="Platform contract" title="API reference" icon={BookOpenCheckIcon} description="The same typed boundaries used by the console are available to CI, the scheduler, and isolated workers." />
    <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>OpenAPI 3.1</CardTitle><CardDescription>Machine-readable contract with bearer security and idempotency requirements.</CardDescription></div><Link href="/api/openapi" target="_blank" className={buttonVariants({ variant: "outline" })}><ExternalLinkIcon /> Open JSON</Link></div></CardHeader><CardContent className="flex gap-2"><Badge variant="secondary"><KeyRoundIcon /> Tokens stay server-side</Badge><Badge variant="outline">v0.4.0</Badge></CardContent></Card>
    <section className="grid gap-3">{endpoints.map(([method, path, description]) => <Card key={`${method}-${path}`}><CardHeader><div className="flex items-center gap-3"><Badge>{method}</Badge><CardTitle className="font-mono text-base">{path}</CardTitle></div><CardDescription>{description}</CardDescription></CardHeader></Card>)}</section>
  </>
}
