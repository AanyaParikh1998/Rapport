"use client"

import { PhoneCall, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export type PastCallMetConnectedFollowUp = {
  contactId: string
  contactName: string
}

export function PastCallMetConnectedFollowUpBanner({
  followUp,
  confirming,
  onConfirm,
  onDismiss,
}: {
  followUp: PastCallMetConnectedFollowUp
  confirming: boolean
  onConfirm: () => void
  onDismiss: () => void
}) {
  return (
    <div className="relative z-10 shrink-0 border-b border-emerald-200/70 bg-emerald-50 px-5 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200/80 bg-emerald-100/60 px-3 py-2.5 dark:border-emerald-800/60 dark:bg-emerald-900/25">
        <div className="flex min-w-0 items-start gap-2.5">
          <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
          <p className="text-[12px] leading-snug text-emerald-950 dark:text-emerald-100">
            Call already completed with {followUp.contactName} · Move to Met / Connected?
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="xs"
            className="border-emerald-300/80 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Saving..." : "Confirm"}
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss follow-up suggestion"
            className="rounded p-1 text-emerald-700/70 transition-colors hover:bg-emerald-200/60 hover:text-emerald-900 dark:text-emerald-300/70 dark:hover:bg-emerald-800/40 dark:hover:text-emerald-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
