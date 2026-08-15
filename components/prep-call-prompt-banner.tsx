"use client"

import { ClipboardList, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CalendarEventMatch } from "@/lib/calendar-matching"

export type PrepCallPrompt = {
  match: CalendarEventMatch
  movedToResponded: boolean
}

export function PrepCallPromptBanner({
  prompt,
  onOpenPrep,
  onDismiss,
}: {
  prompt: PrepCallPrompt
  onOpenPrep: (match: CalendarEventMatch) => void
  onDismiss: () => void
}) {
  const message = prompt.movedToResponded
    ? "Moved to Responded. Open prep sheet now or find it anytime in the Outreach & History tab."
    : "Call logged. Open prep sheet now or find it anytime in the Outreach & History tab."

  return (
    <div className="relative z-10 shrink-0 border-b border-blue-200/70 bg-blue-50 px-5 py-3 dark:border-blue-900/50 dark:bg-blue-950/30">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200/80 bg-blue-100/60 px-3 py-2.5 dark:border-blue-800/60 dark:bg-blue-900/25">
        <p className="min-w-0 text-[12px] leading-snug text-blue-950 dark:text-blue-100">
          {message}
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="xs"
            className="border-blue-300/80 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
            onClick={() => onOpenPrep(prompt.match)}
          >
            <ClipboardList className="h-3 w-3" data-icon="inline-start" />
            Open prep sheet
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss prep prompt"
            className="rounded p-1 text-blue-700/70 transition-colors hover:bg-blue-200/60 hover:text-blue-900 dark:text-blue-300/70 dark:hover:bg-blue-800/40 dark:hover:text-blue-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
