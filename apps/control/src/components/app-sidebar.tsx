"use client"

import { BotIcon, BoxesIcon, CircleGaugeIcon, FileCheck2Icon, FileCogIcon, FingerprintIcon, GitPullRequestArrowIcon, HistoryIcon, LibraryIcon, NetworkIcon, PlayIcon, Settings2Icon, ShieldCheckIcon, SparklesIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavUser } from "@/components/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

const sections = [
  { title: "Control center", description: "Posture and traceability", icon: CircleGaugeIcon, views: [
    { label: "Home", href: "/dashboard", icon: CircleGaugeIcon },
    { label: "Coverage", href: "/coverage", icon: FileCheck2Icon },
  ] },
  { title: "Platform", description: "Applications and topology", icon: BoxesIcon, views: [
    { label: "Applications", href: "/applications", icon: BoxesIcon },
    { label: "System Graph", href: "/system-graph", icon: NetworkIcon },
  ] },
  { title: "Specifications", description: "Versioned verification intent", icon: FileCogIcon, views: [
    { label: "Requirements", href: "/specifications", icon: FileCogIcon },
    { label: "Test Library", href: "/test-library", icon: LibraryIcon },
  ] },
  { title: "AI generation", description: "Governed check proposals", icon: SparklesIcon, views: [
    { label: "Studio", href: "/studio", icon: SparklesIcon },
    { label: "AI Agents", href: "/agents", icon: BotIcon },
  ] },
  { title: "Operate", description: "Runs and immutable evidence", icon: PlayIcon, views: [
    { label: "Runs", href: "/runs", icon: PlayIcon },
    { label: "Results", href: "/results", icon: HistoryIcon },
  ] },
  { title: "Governance", description: "Approval and traceability", icon: ShieldCheckIcon, views: [
    { label: "Remediations", href: "/remediations", icon: GitPullRequestArrowIcon },
    { label: "Audit chain", href: "/audit", icon: FingerprintIcon },
  ] },
] as const

function routeIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: { name: string; email: string; avatar: string; role: string } }) {
  const pathname = usePathname()
  const activeSection = sections.find((section) => section.views.some((view) => routeIsActive(pathname, view.href))) ?? sections[0]

  return (
    <Sidebar collapsible="icon" className="overflow-hidden *:data-[sidebar=sidebar]:flex-row" {...props}>
      <Sidebar collapsible="none" className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r">
        <SidebarHeader><SidebarMenu><SidebarMenuItem>
          <SidebarMenuButton size="lg" className="md:h-8 md:p-0" render={<Link href="/dashboard" />}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><ShieldCheckIcon className="size-4" /></div><span className="font-semibold">Verity</span>
          </SidebarMenuButton>
        </SidebarMenuItem></SidebarMenu></SidebarHeader>
        <SidebarContent><SidebarGroup><SidebarGroupContent className="px-1.5 md:px-0"><SidebarMenu>
          {sections.map((section) => <SidebarMenuItem key={section.title}><SidebarMenuButton tooltip={{ children: section.title, hidden: false }} isActive={activeSection.title === section.title} className="px-2.5 md:px-2" render={<Link href={section.views[0].href} />}><section.icon /><span>{section.title}</span></SidebarMenuButton></SidebarMenuItem>)}
        </SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
        <SidebarFooter><NavUser user={user} /></SidebarFooter>
      </Sidebar>

      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4"><div><p className="text-base font-medium text-foreground">{activeSection.title}</p><p className="text-xs text-muted-foreground">{activeSection.description}</p></div></SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-2"><SidebarGroupContent><SidebarMenu>
            {activeSection.views.map((view) => <SidebarMenuItem key={view.href}><SidebarMenuButton isActive={routeIsActive(pathname, view.href)} render={<Link href={view.href} />}><view.icon /><span>{view.label}</span></SidebarMenuButton></SidebarMenuItem>)}
          </SidebarMenu></SidebarGroupContent></SidebarGroup>
          <SidebarGroup className="mt-auto"><SidebarGroupContent><SidebarMenu>
            <SidebarMenuItem><SidebarMenuButton render={<Link href="/studio" />}><BotIcon /> Local model</SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton render={<Link href="/applications" />}><Settings2Icon /> Connection boundary</SidebarMenuButton></SidebarMenuItem>
          </SidebarMenu></SidebarGroupContent></SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
