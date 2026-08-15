"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Contact } from "@/lib/data"
import {
  fetchOutreachDraftsByContactId,
  formatDraftDate,
  formatDraftTypeLabel,
  previewDraftBody,
  type OutreachDraft,
} from "@/lib/outreach-drafts"

const NO_SAVED_DRAFT_VALUE = "__no_saved_draft__"

const selectClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function SendMessageConfirmModal({
  contact,
  open,
  onClose,
  onConfirmSent,
  onConfirmMoveOnly,
}: {
  contact: Contact | null
  open: boolean
  onClose: () => void
  onConfirmSent: (draftId: string | null) => Promise<void>
  onConfirmMoveOnly: () => Promise<void>
}) {
  const [drafts, setDrafts] = useState<OutreachDraft[]>([])
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [selectedDraftId, setSelectedDraftId] = useState<string>(NO_SAVED_DRAFT_VALUE)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !contact) return

    let cancelled = false
    setLoadingDrafts(true)
    setError(null)
    setSelectedDraftId(NO_SAVED_DRAFT_VALUE)

    fetchOutreachDraftsByContactId(contact.id)
      .then((data) => {
        if (!cancelled) {
          setDrafts(data)
          setSelectedDraftId(data[0]?.id ?? NO_SAVED_DRAFT_VALUE)
        }
      })
      .catch(() => {
        if (!cancelled) setDrafts([])
      })
      .finally(() => {
        if (!cancelled) setLoadingDrafts(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, contact?.id])

  if (!open || !contact) return null

  function formatDraftOptionLabel(draft: OutreachDraft): string {
    const typeLabel = formatDraftTypeLabel(draft.format)
    const dateLabel = formatDraftDate(draft.createdAt)
    const preview = previewDraftBody(draft.body, 40)
    return `${typeLabel} · ${dateLabel} · ${preview}`
  }

  async function handleConfirmSent() {
    setSubmitting(true)
    setError(null)

    try {
      const draftId =
        selectedDraftId === NO_SAVED_DRAFT_VALUE ? null : selectedDraftId
      await onConfirmSent(draftId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setSubmitting(false)
    }
  }

  async function handleConfirmMoveOnly() {
    setSubmitting(true)
    setError(null)

    try {
      await onConfirmMoveOnly()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!submitting) onClose()
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-message-confirm-title"
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="send-message-confirm-title" className="text-sm font-semibold text-foreground">
              Did you send a message to {contact.name}?
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Moving this contact to In progress
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Which message did you send?
            </span>
            <select
              value={selectedDraftId}
              onChange={(event) => setSelectedDraftId(event.target.value)}
              disabled={loadingDrafts || submitting}
              className={selectClassName}
            >
              {drafts.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {formatDraftOptionLabel(draft)}
                </option>
              ))}
              <option value={NO_SAVED_DRAFT_VALUE}>No saved draft, I sent something else</option>
            </select>
          </label>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleConfirmMoveOnly}
              disabled={submitting}
              className="sm:order-1"
            >
              Not yet, just moving them
            </Button>
            <Button type="button" onClick={handleConfirmSent} disabled={submitting || loadingDrafts}>
              {submitting ? "Saving..." : "Yes, I sent a message"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
