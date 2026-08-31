import { prisma } from "@verity/data"
import { canConfigureVerification } from "@verity/domain"
import { CalendarClockIcon } from "lucide-react"
import { getServerSession } from "next-auth"

import { createSchedule, toggleSchedule } from "@/app/(console)/actions"
import { authOptions } from "@/auth-options"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { schedulePresets } from "@/lib/schedules"

export default async function SchedulesPage() {
  const session = await getServerSession(authOptions)
  const canConfigure = Boolean(session?.user && canConfigureVerification(session.user.role))
  const schedules = await prisma.schedule.findMany({ include: { system: true, createdBy: true, _count: { select: { runs: true } } }, orderBy: { createdAt: "desc" } })
  return <>
    <PageHeader eyebrow="Operate" title="Schedules" icon={CalendarClockIcon} description="A database-backed cron registry is claimed under an advisory lock; due runs enter the same transactional outbox and Redis execution path as manual runs." />
    {canConfigure && <Card><CardHeader><CardTitle>Create schedule</CardTitle><CardDescription>V1 intentionally supports four explicit cron presets.</CardDescription></CardHeader><CardContent><form action={createSchedule} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><Input name="name" required minLength={3} maxLength={80} placeholder="Release verification" /><NativeSelect name="cron" required>{schedulePresets.map((preset) => <NativeSelectOption value={preset.cron} key={preset.cron}>{preset.label} · {preset.cron}</NativeSelectOption>)}</NativeSelect><Button type="submit">Create schedule</Button></form></CardContent></Card>}
    <section className="grid gap-3">{schedules.length ? schedules.map((schedule) => <Card key={schedule.id}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{schedule.name}</CardTitle><CardDescription>{schedule.system.name} · {schedule.cron} · by {schedule.createdBy.name}</CardDescription></div><Badge variant={schedule.enabled ? "default" : "secondary"}>{schedule.enabled ? "active" : "paused"}</Badge></div></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><span>Next {schedule.nextRunAt.toLocaleString("en-GH")} · Last {schedule.lastRunAt?.toLocaleString("en-GH") ?? "never"} · {schedule._count.runs} runs</span>{canConfigure && <form action={toggleSchedule}><input type="hidden" name="scheduleId" value={schedule.id} /><Button size="sm" variant="outline">{schedule.enabled ? "Pause" : "Resume"}</Button></form>}</CardContent></Card>) : <Card><CardHeader><CardTitle>No schedules</CardTitle><CardDescription>Create one from an allowlisted cron preset.</CardDescription></CardHeader></Card>}</section>
  </>
}
