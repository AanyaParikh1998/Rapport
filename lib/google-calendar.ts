import { google } from "googleapis"
import type { CalendarEvent } from "@/lib/calendar-matching"
import { resolveCalendarTimeZone } from "@/lib/calendar-time"
import type { UserIntegrationRow } from "@/lib/user-integrations"

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"
export const GOOGLE_GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"

export const GOOGLE_OAUTH_SCOPES = [GOOGLE_CALENDAR_SCOPE, GOOGLE_GMAIL_SCOPE]

export function getGoogleRedirectUri(): string {
  return (
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
    "http://localhost:3000/api/calendar/callback"
  )
}

export function createGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET")
  }

  return new google.auth.OAuth2(clientId, clientSecret, getGoogleRedirectUri())
}

export function getGoogleAuthUrl(): string {
  const oauth2Client = createGoogleOAuthClient()

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_OAUTH_SCOPES,
  })
}

export function getAuthenticatedGoogleClient(integration: UserIntegrationRow) {
  const oauth2Client = createGoogleOAuthClient()

  oauth2Client.setCredentials({
    access_token: integration.access_token ?? undefined,
    refresh_token: integration.refresh_token ?? undefined,
    expiry_date: integration.expires_at
      ? new Date(integration.expires_at).getTime()
      : undefined,
  })

  return oauth2Client
}

export async function fetchRecentCalendarEvents(
  integration: UserIntegrationRow,
): Promise<{
  events: CalendarEvent[]
  rawCount: number
  filteredCount: number
  rawEvents: Array<{
    id: string | null | undefined
    title: string
    start: string | null | undefined
    end: string | null | undefined
    timeZone: string
  }>
}> {
  const auth = getAuthenticatedGoogleClient(integration)
  const calendar = google.calendar({ version: "v3", auth })

  const nowUtcMs = Date.now()
  const timeMin = new Date(nowUtcMs - 30 * 24 * 60 * 60 * 1000).toISOString()
  const timeMax = new Date(nowUtcMs + 90 * 24 * 60 * 60 * 1000).toISOString()

  const [calendarResponse, eventsResponse] = await Promise.all([
    calendar.calendars.get({ calendarId: "primary" }),
    calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    }),
  ])

  const calendarTimeZone = resolveCalendarTimeZone(calendarResponse.data.timeZone)
  const items = eventsResponse.data.items ?? []

  const events: CalendarEvent[] = items.map((event) => {
    const eventTimeZone = resolveCalendarTimeZone(
      event.start?.timeZone,
      event.end?.timeZone,
      calendarTimeZone,
    )
    const isAllDay = Boolean(event.start?.date && !event.start?.dateTime)
    const start = event.start?.dateTime ?? event.start?.date ?? new Date(nowUtcMs).toISOString()
    const end = event.end?.dateTime ?? event.end?.date ?? start

    return {
      id: event.id ?? `${event.summary}-${start}`,
      title: event.summary?.trim() || "Untitled event",
      description: event.description?.trim() ?? "",
      start,
      end,
      timeZone: eventTimeZone,
      htmlLink: event.htmlLink ?? null,
      hangoutLink: event.hangoutLink ?? null,
      attendeeEmails: (event.attendees ?? [])
        .map((attendee) => attendee.email?.trim().toLowerCase() ?? "")
        .filter(Boolean),
      isAllDay,
    }
  })

  return {
    events,
    rawCount: items.length,
    filteredCount: events.length,
    rawEvents: items.map((event) => ({
      id: event.id,
      title: event.summary?.trim() || "Untitled event",
      start: event.start?.dateTime ?? event.start?.date,
      end: event.end?.dateTime ?? event.end?.date,
      timeZone: resolveCalendarTimeZone(
        event.start?.timeZone,
        event.end?.timeZone,
        calendarTimeZone,
      ),
    })),
  }
}
