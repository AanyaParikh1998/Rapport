"use client"

import { CalendarClock, ClipboardList, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CalendarEventMatch } from "@/lib/calendar-matching"
import { canPrepForUpcomingCall, formatCalendarMatchBannerText } from "@/lib/calendar-matching"
import { getCalendarDismissalKey } from "@/lib/dismissed-calendar-events"

export function getCalendarMatchKey(match: CalendarEventMatch): string {
  return getCalendarDismissalKey(match.contact.id, match.event.id)
}

export function CalendarMatchBanners({
  matches,
  dismissedKeys,
  confirmingKey,
  onDismiss,
  onConfirm,
  onPrep,
}: {
  matches: CalendarEventMatch[]
  dismissedKeys: Set<string>
  confirmingKey: string | null
  onDismiss: (match: CalendarEventMatch) => void
  onConfirm: (match: CalendarEventMatch) => void
  onPrep: (match: CalendarEventMatch) => void
}) {
  const visibleMatches = matches.filter((match) => !dismissedKeys.has(getCalendarMatchKey(match)))

  console.log("[calendar-banners] render", {
    matchesLength: matches.length,
    visibleMatchesLength: visibleMatches.length,
    dismissedCount: dismissedKeys.size,
    willRender: visibleMatches.length > 0,
  })

  if (visibleMatches.length === 0) {
    return null
  }

  return (
    <div className="relative z-10 shrink-0 border-b border-border bg-muted/20 px-5 py-3">
      <div className="flex flex-col gap-2">
        {visibleMatches.map((match) => {
          const key = getCalendarMatchKey(match)
          const bannerText = formatCalendarMatchBannerText(match)

          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-[12px] leading-snug text-foreground">{bannerText}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {canPrepForUpcomingCall(match) ? (
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => onPrep(match)}
                  >
                    <ClipboardList className="h-3 w-3" data-icon="inline-start" />
                    Prep for call
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="xs"
                  onClick={() => onConfirm(match)}
                  disabled={confirmingKey === key}
                >
                  {confirmingKey === key ? "Saving..." : "Confirm"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    console.log("[calendar-banners] dismiss clicked", {
                      contactId: match.contact.id,
                      contactName: match.contact.name,
                      eventId: match.event.id,
                      eventTitle: match.event.title,
                      timing: match.timing,
                    })
                    onDismiss(match)
                  }}
                  aria-label="Dismiss calendar suggestion"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
