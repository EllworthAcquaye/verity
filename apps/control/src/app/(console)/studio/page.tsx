import { prisma } from "@verity/data"
import { canConfigureVerification } from "@verity/domain"
import { BotIcon, CloudIcon, FilmIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react"
import { getServerSession } from "next-auth"

import { authOptions } from "@/auth-options"
import { GenerateForm } from "@/components/generate-form"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function StudioPage() {
  const session = await getServerSession(authOptions)
  const canGenerate = Boolean(session?.user && canConfigureVerification(session.user.role))
  const specs = await prisma.spec.findMany({ orderBy: [{ createdAt: "desc" }, { version: "desc" }], include: { checks: { where: { origin: "generated" }, orderBy: { createdAt: "desc" } } } })
  const generated = specs.flatMap((spec) => spec.checks.map((check) => ({ ...check, specTitle: spec.title, specVersion: spec.version })))
  return <>
    <PageHeader eyebrow="Automation" title="Studio" icon={SparklesIcon} description="Generate declarative checks through a provider-neutral boundary. The model can propose only typed probe operations; it cannot emit code, shell, SQL, arbitrary tools or mutate trust." />
    <section className="grid gap-4 xl:grid-cols-[minmax(320px,.8fr)_minmax(0,1.4fr)]">
      <Card><CardHeader><CardTitle>Generate candidate</CardTitle><CardDescription>{canGenerate ? "Ollama is live and keyless by default. Each request is replayed once; mismatched output is rejected." : "Engineer or admin role required."}</CardDescription></CardHeader><CardContent><GenerateForm disabled={!canGenerate} specs={specs.map((spec) => ({ id: spec.id, label: `${spec.title} · v${spec.version}` }))} /></CardContent></Card>
      <div className="grid gap-4 sm:grid-cols-3">
        <ProviderCard icon={BotIcon} title="Ollama" badge="reviewer default" description="Live qwen3:1.7b generation, constrained by JSON Schema and revalidated by Pydantic." />
        <ProviderCard icon={FilmIcon} title="Cassette" badge="CI / recovery" description="Deterministic typed fallback. Explicitly not represented as live AI generation." />
        <ProviderCard icon={CloudIcon} title="Anthropic" badge="optional" description="Same contract via structured outputs. Available only with the explicit key-and-egress overlay." />
      </div>
    </section>
    <Card><CardHeader><CardTitle>Generated review queue</CardTitle><CardDescription>{generated.length} persisted candidates. Every item enters as draft and requires human validation in Test Library.</CardDescription></CardHeader><CardContent className="grid gap-3 lg:grid-cols-2">{generated.length ? generated.map((check) => {
      const definition = check.definition as { name?: string; trust_level?: string; steps?: unknown[] }
      return <div key={check.id} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{definition.name ?? "Generated check"}</p><p className="text-xs text-muted-foreground">{check.specTitle} · v{check.specVersion}</p></div><Badge variant={check.status === "validated" ? "default" : "outline"}>{check.status}</Badge></div><div className="mt-4 flex flex-wrap gap-2"><Badge variant="secondary"><ShieldCheckIcon />{definition.trust_level ?? check.trustLevel}</Badge><Badge variant="secondary">{definition.steps?.length ?? 0} typed steps</Badge><Badge variant="outline">{check.domain}</Badge></div></div>
    }) : <p className="text-sm text-muted-foreground">No generated candidates yet. Select a specification above.</p>}</CardContent></Card>
  </>
}

function ProviderCard({ icon: Icon, title, badge, description }: { icon: React.ComponentType<{ className?: string }>; title: string; badge: string; description: string }) {
  return <Card><CardHeader><div className="flex items-center justify-between"><Icon className="size-5 text-muted-foreground" /><Badge variant="outline">{badge}</Badge></div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader></Card>
}
