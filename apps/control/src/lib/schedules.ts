export const schedulePresets = [
  { cron: "*/5 * * * *", label: "Every 5 minutes" },
  { cron: "*/15 * * * *", label: "Every 15 minutes" },
  { cron: "0 * * * *", label: "Hourly" },
  { cron: "0 9 * * *", label: "Daily at 09:00 UTC" },
] as const

export function nextOccurrence(cron: string, from = new Date()) {
  const next = new Date(from)
  next.setUTCSeconds(0, 0)
  if (cron === "*/5 * * * *" || cron === "*/15 * * * *") {
    const interval = cron.startsWith("*/5 ") ? 5 : 15
    next.setUTCMinutes(Math.floor(next.getUTCMinutes() / interval) * interval + interval)
    return next
  }
  if (cron === "0 * * * *") {
    next.setUTCMinutes(0)
    next.setUTCHours(next.getUTCHours() + 1)
    return next
  }
  if (cron === "0 9 * * *") {
    next.setUTCHours(9, 0, 0, 0)
    if (next <= from) next.setUTCDate(next.getUTCDate() + 1)
    return next
  }
  throw new Error("Cron expression is outside the supported reviewer presets.")
}
