import { prisma } from "@verity/data"
import { PlayIcon } from "lucide-react"
import { getServerSession } from "next-auth"
import Link from "next/link"
import { redirect } from "next/navigation"

import { authOptions } from "@/auth-options"
import { AppSidebar } from "@/components/app-sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function ConsoleLayout({ children }: LayoutProps<"/">) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  const system = await prisma.system.findFirst({ orderBy: { createdAt: "asc" } })

  return (
    <SidebarProvider style={{ "--sidebar-width": "19rem" } as React.CSSProperties}>
      <AppSidebar user={{ name: session.user.name ?? "Verity user", email: session.user.email ?? "", avatar: session.user.image ?? "", role: session.user.role }} />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" /><Separator orientation="vertical" className="mr-2 data-vertical:h-4" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{system?.name ?? "No configured system"} / {system?.environment ?? "setup"}</p><p className="truncate text-xs text-muted-foreground">Governed verification console</p></div>
          <Badge variant="outline" className="hidden gap-1 sm:flex"><span className="size-1.5 rounded-full bg-emerald-500" /> persisted</Badge><ModeToggle />
          <Link href="/runs" className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}><PlayIcon /> Run verification</Link>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
