export function resolveCalendarTimeZone(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim()
    if (trimmed) return trimmed
  }

  return "UTC"
}

export function getEventInstantMs(isoDateTime: string): number {
  const ms = new Date(isoDateTime).getTime()
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid calendar dateTime: ${isoDateTime}`)
  }
  return ms
}

export function formatCalendarEventStartTime(startDateTime: string): string {
  return new Date(startDateTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatPastCallEndedLabel(endDateTime: string, nowMs = Date.now()): string {
  const diffMs = nowMs - new Date(endDateTime).getTime()
  const elapsedMs = Math.max(0, diffMs)
  const diffMinutes = Math.floor(elapsedMs / (1000 * 60))
  const diffHours = Math.floor(elapsedMs / (1000 * 60 * 60))

  if (diffMinutes < 60) {
    if (diffMinutes <= 1) return "ended 1 minute ago"
    return `ended ${diffMinutes} minutes ago`
  }

  if (diffHours === 1) return "ended 1 hour ago"
  return `ended ${diffHours} hours ago`
}

export function formatUpcomingCallStartsInLabel(startDateTime: string, nowMs = Date.now()): string {
  const diffMs = new Date(startDateTime).getTime() - nowMs
  const remainingMs = Math.max(0, diffMs)
  const diffMinutes = Math.floor(remainingMs / (1000 * 60))
  const diffHours = Math.floor(remainingMs / (1000 * 60 * 60))

  if (diffMinutes < 60) {
    if (diffMinutes <= 1) return "in 1 minute"
    return `in ${diffMinutes} minutes`
  }

  if (diffHours === 1) return "in 1 hour"
  return `in ${diffHours} hours`
}
