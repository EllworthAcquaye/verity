"use client"

import * as React from "react"
import {
  BotIcon,
  ChartNoAxesCombinedIcon,
  CircleGaugeIcon,
  ClipboardCheckIcon,
  FileCheck2Icon,
  FileCogIcon,
  GitPullRequestArrowIcon,
  HistoryIcon,
  PlayIcon,
  ScrollTextIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  WrenchIcon,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const sections = [
  {
    title: "Control center",
    description: "Posture, gates, and activity",
    icon: CircleGaugeIcon,
    views: ["Overview", "Release gates", "Active runs"],
  },
  {
    title: "Specifications",
    description: "Versioned verification intent",
    icon: FileCogIcon,
    views: ["Service contract", "Coverage map", "Policy history"],
  },
  {
    title: "AI generation",
    description: "Governed check proposals",
    icon: SparklesIcon,
    views: ["Generate checks", "Review queue", "Model evaluations"],
  },
  {
    title: "Runs",
    description: "Isolated execution plane",
    icon: PlayIcon,
    views: ["All runs", "Scheduled", "Execution workers"],
  },
  {
    title: "Results",
    description: "Immutable evidence",
    icon: ClipboardCheckIcon,
    views: ["Latest results", "Regressions", "Evidence ledger"],
  },
  {
    title: "Remediation",
    description: "Approval-gated repair",
    icon: WrenchIcon,
    views: ["Findings", "Proposals", "Approvals"],
  },
  {
    title: "Reports",
    description: "Audit and release proof",
    icon: ChartNoAxesCombinedIcon,
    views: ["Release summary", "Coverage trends", "Audit export"],
  },
]

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; avatar: string; role: string }
}) {
  const [activeSection, setActiveSection] = React.useState(sections[0])
  const [activeView, setActiveView] = React.useState(sections[0].views[0])
  const { setOpen } = useSidebar()

  function selectSection(section: (typeof sections)[number]) {
    setActiveSection(section)
    setActiveView(section.views[0])
    setOpen(true)
  }

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      <Sidebar collapsible="none" className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="md:h-8 md:p-0">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ShieldCheckIcon className="size-4" />
                </div>
                <span className="font-semibold">Verity</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {sections.map((section) => (
                  <SidebarMenuItem key={section.title}>
                    <SidebarMenuButton
                      tooltip={{ children: section.title, hidden: false }}
                      onClick={() => selectSection(section)}
                      isActive={activeSection.title === section.title}
                      className="px-2.5 md:px-2"
                    >
                      <section.icon />
                      <span>{section.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>

      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div>
            <p className="text-base font-medium text-foreground">{activeSection.title}</p>
            <p className="text-xs text-muted-foreground">{activeSection.description}</p>
          </div>
          <SidebarInput aria-label={`Search ${activeSection.title}`} placeholder="Search this area…" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-2">
            <SidebarGroupContent>
              <SidebarMenu>
                {activeSection.views.map((view, index) => {
                  const icons = [FileCheck2Icon, GitPullRequestArrowIcon, HistoryIcon]
                  const Icon = icons[index] ?? ScrollTextIcon
                  return (
                    <SidebarMenuItem key={view}>
                      <SidebarMenuButton
                        isActive={activeView === view}
                        onClick={() => setActiveView(view)}
                      >
                        <Icon />
                        <span>{view}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <BotIcon /> Local model
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Settings2Icon /> Workspace settings
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
