import { supabase } from "@/lib/supabase/client"

export type DismissedCalendarEvent = {
  id: string
  contactId: string
  eventId: string
  createdAt: string
}

type DismissedCalendarEventRow = {
  id: string
  contact_id: string
  event_id: string
  created_at: string
}

function mapDismissedCalendarEventRow(row: DismissedCalendarEventRow): DismissedCalendarEvent {
  return {
    id: row.id,
    contactId: row.contact_id,
    eventId: row.event_id,
    createdAt: row.created_at,
  }
}

export function getCalendarDismissalKey(contactId: string, eventId: string): string {
  return `${contactId}:${eventId}`
}

export async function fetchDismissedCalendarEvents(): Promise<DismissedCalendarEvent[]> {
  const { data, error } = await supabase
    .from("dismissed_calendar_events")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[dismissed-calendar-events] fetch failed", error)
    throw error
  }

  console.log("[dismissed-calendar-events] fetched dismissals", {
    count: data?.length ?? 0,
    rows: data,
  })

  return (data as DismissedCalendarEventRow[]).map(mapDismissedCalendarEventRow)
}

export async function fetchDismissedCalendarEventKeys(): Promise<Set<string>> {
  const dismissals = await fetchDismissedCalendarEvents()
  const keys = dismissals.map((dismissal) =>
    getCalendarDismissalKey(dismissal.contactId, dismissal.eventId),
  )

  console.log("[dismissed-calendar-events] dismissal keys", keys)

  return new Set(keys)
}

export async function dismissCalendarEventMatch(
  contactId: string,
  eventId: string,
): Promise<DismissedCalendarEvent> {
  console.log("[dismissed-calendar-events] inserting dismissal", {
    contactId,
    eventId,
  })

  const { data, error } = await supabase
    .from("dismissed_calendar_events")
    .insert({
      contact_id: contactId,
      event_id: eventId,
    })
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") {
      console.log("[dismissed-calendar-events] dismissal already exists", {
        contactId,
        eventId,
      })

      const { data: existing, error: existingError } = await supabase
        .from("dismissed_calendar_events")
        .select("*")
        .eq("contact_id", contactId)
        .eq("event_id", eventId)
        .single()

      if (existingError) {
        console.error("[dismissed-calendar-events] fetch existing dismissal failed", existingError)
        throw existingError
      }

      return mapDismissedCalendarEventRow(existing as DismissedCalendarEventRow)
    }

    console.error("[dismissed-calendar-events] insert failed", {
      contactId,
      eventId,
      error,
    })
    throw error
  }

  console.log("[dismissed-calendar-events] insert succeeded", data)

  return mapDismissedCalendarEventRow(data as DismissedCalendarEventRow)
}
