"use client"

import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  formatGmailMatchBannerText,
  getGmailConfirmButtonLabel,
  getGmailMatchKey,
  type GmailMessageMatch,
} from "@/lib/gmail-matching"

export { getGmailMatchKey }

export function GmailMatchBanners({
  matches,
  dismissedKeys,
  confirmingKey,
  onDismiss,
  onConfirm,
}: {
  matches: GmailMessageMatch[]
  dismissedKeys: Set<string>
  confirmingKey: string | null
  onDismiss: (match: GmailMessageMatch) => void
  onConfirm: (match: GmailMessageMatch) => void
}) {
  const visibleMatches = matches.filter((match) => !dismissedKeys.has(getGmailMatchKey(match)))

  console.log("[gmail-banners] render", {
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
          const key = getGmailMatchKey(match)
          const bannerText = formatGmailMatchBannerText(match)
          const confirmLabel = getGmailConfirmButtonLabel(match.action)

          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-[12px] leading-snug text-foreground">{bannerText}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  size="xs"
                  onClick={() => onConfirm(match)}
                  disabled={confirmingKey === key}
                >
                  {confirmingKey === key ? "Saving..." : confirmLabel}
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => onDismiss(match)}
                  disabled={confirmingKey === key}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
