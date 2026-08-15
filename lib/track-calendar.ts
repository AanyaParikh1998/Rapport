export function getDefaultTrackCalendar(connectionType: string): boolean {
  return connectionType.trim().toLowerCase() !== "hot"
}

export function getTrackCalendarSuggestion(connectionType: string): {
  prefix: string
  detail: string
  tone: "amber" | "muted"
} {
  const normalized = connectionType.trim().toLowerCase()

  if (normalized === "hot") {
    return {
      prefix: "Suggested: off",
      detail:
        "You likely have personal events with this contact that are not networking related",
      tone: "amber",
    }
  }

  if (normalized === "warm") {
    return {
      prefix: "Suggested: on",
      detail: "Track professional touchpoints with this contact",
      tone: "muted",
    }
  }

  return {
    prefix: "Suggested: on",
    detail: "Any calendar event with this contact is likely networking related",
    tone: "muted",
  }
}

/**
 * Calendar-only preference. When false, skip this contact for Google Calendar
 * event detection and banners. Does not affect Gmail matching.
 */
export function shouldTrackCalendarForContact(contact: {
  trackCalendar: boolean
}): boolean {
  return contact.trackCalendar
}

/**
 * Gmail matching is always enabled for all contacts. track_calendar does not
 * apply. A future track_gmail column can gate this separately.
 */
export function shouldTrackGmailForContact(
  _contact: { trackCalendar?: boolean },
): boolean {
  return true
}
