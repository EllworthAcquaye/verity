import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

export function PageHeader({ eyebrow, title, description, icon: Icon, actions }: {
  eyebrow: string
  title: string
  description: string
  icon?: LucideIcon
  actions?: React.ReactNode
}) {
  return (
    <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2"><Badge variant="outline">{eyebrow}</Badge>{Icon ? <Icon className="size-4 text-muted-foreground" /> : null}</div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  )
}
