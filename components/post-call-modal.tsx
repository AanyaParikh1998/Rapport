"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Contact } from "@/lib/data"
import { getFirstName } from "@/lib/initials"
import {
  updateSummarizedManualInteraction,
} from "@/lib/interactions"
import {
  formatTodayDateLabel,
  parsePostCallSummaryFromApi,
  serializeSummaryBullets,
  type PostCallDraftContext,
  type PostCallModalEditState,
  type PostCallSummary,
} from "@/lib/post-call-context"

const textareaClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function PostCallModal({
  open,
  contact,
  interactionLabel,
  interactionId = null,
  editInteraction = null,
  onClose,
  onSaved,
  onSaveAndDraftFollowUp,
}: {
  open: boolean
  contact: Contact
  interactionLabel: string
  interactionId?: string | null
  editInteraction?: PostCallModalEditState | null
  onClose: () => void
  onSaved: (result?: { updated?: boolean }) => void
  onSaveAndDraftFollowUp?: (context: PostCallDraftContext) => void
}) {
  const [pastedNotes, setPastedNotes] = useState("")
  const [summarizing, setSummarizing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<PostCallSummary | null>(null)
  const boundInteractionIdRef = useRef<string | null>(null)

  const preCallNotes = contact.preCallNotes?.trim() ?? ""
  const isEditMode = editInteraction !== null
  const headerDateLabel = editInteraction?.dateLabel ?? formatTodayDateLabel()

  useEffect(() => {
    if (!open) {
      boundInteractionIdRef.current = null
      return
    }

    boundInteractionIdRef.current =
      editInteraction?.interactionId ?? interactionId ?? null

    setPastedNotes(editInteraction?.initialTextareaValue ?? "")
    setSummary(null)
    setError(null)
    setSummarizing(false)
    setSaving(false)
  }, [open, contact.id, interactionLabel, editInteraction, interactionId])

  if (!open) return null

  async function handleSummarize() {
    const trimmedNotes = pastedNotes.trim()
    if (!trimmedNotes) {
      setError("Paste your call notes before summarizing.")
      return
    }

    setSummarizing(true)
    setError(null)

    try {
      const response = await fetch("/api/summarize-interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: trimmedNotes,
          preCallNotes,
          postCallMode: true,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to summarize notes")
      }

      setSummary(parsePostCallSummaryFromApi(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSummarizing(false)
    }
  }

  async function persistSummary(nextSummary: PostCallSummary) {
    const payload = {
      summaryDiscussed: serializeSummaryBullets(nextSummary.discussed),
      summaryCommitments: serializeSummaryBullets(nextSummary.commitments),
      summaryFollowups: serializeSummaryBullets(nextSummary.next_steps),
      summaryNotCovered: serializeSummaryBullets(nextSummary.not_covered ?? []),
      rawNotes: pastedNotes.trim() || null,
    }

    const targetInteractionId = boundInteractionIdRef.current

    if (!targetInteractionId) {
      throw new Error("No interaction selected for saving summary.")
    }

    return updateSummarizedManualInteraction({
      id: targetInteractionId,
      stage: contact.stage,
      ...payload,
    })
  }

  async function handleSaveSummary() {
    if (!summary) {
      setError("Generate a summary before saving.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      await persistSummary(summary)
      onSaved({ updated: isEditMode })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save summary")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAndDraftFollowUp() {
    if (!summary) {
      setError("Generate a summary before drafting a follow-up.")
      return
    }

    if (!onSaveAndDraftFollowUp) {
      setError("Follow-up drafting is not available.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      await persistSummary(summary)

      onSaveAndDraftFollowUp({
        preCallNotes,
        callSummary: summary,
      })

      onSaved({ updated: isEditMode })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save summary")
    } finally {
      setSaving(false)
    }
  }

  const busy = summarizing || saving

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/40"
          onClick={() => {
            if (!busy) onClose()
          }}
          aria-label="Close post-call modal"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-call-title"
          className="relative z-10 flex max-h-[90vh] min-h-[min(640px,85vh)] w-full min-w-[700px] max-w-[900px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="shrink-0 border-b border-border px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="post-call-title" className="text-sm font-semibold text-foreground">
                  {isEditMode
                    ? `Edit call notes with ${getFirstName(contact.name)}`
                    : `Log your call with ${getFirstName(contact.name)}`}
                </h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {interactionLabel} · {headerDateLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[2fr_3fr] overflow-hidden">
            <section className="flex min-h-0 flex-col border-r border-border">
              <div className="shrink-0 bg-[#E6F1FB] px-4 py-2.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-blue-900">
                  What you planned
                </h3>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {preCallNotes ? (
                  <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">
                    {preCallNotes}
                  </p>
                ) : (
                  <p className="text-[12px] text-muted-foreground">No pre-call notes were added</p>
                )}
              </div>
            </section>

            <section className="flex min-h-0 flex-col">
              <div className="shrink-0 bg-[#EAF3DE] px-4 py-2.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900">
                  What actually happened
                </h3>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <textarea
                  value={pastedNotes}
                  onChange={(event) => setPastedNotes(event.target.value)}
                  rows={8}
                  disabled={busy}
                  placeholder="Paste your Granola notes or a summary of what was discussed, commitments made, and next steps"
                  className={cn(textareaClassName, "min-h-[160px] resize-y")}
                />

                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleSummarize()}
                    disabled={busy || !pastedNotes.trim()}
                  >
                    {summarizing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" data-icon="inline-start" />
                        Summarizing...
                      </>
                    ) : (
                      "Summarize"
                    )}
                  </Button>
                </div>

                {summary ? (
                  <div className="mt-4 space-y-3">
                    <SummaryPreview summary={summary} />
                  </div>
                ) : isEditMode && editInteraction ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Current saved version
                    </p>
                    <SummaryPreview summary={editInteraction.savedSummary} />
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          {error ? (
            <p className="shrink-0 border-t border-border px-5 py-2 text-[12px] text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex shrink-0 items-center border-t border-border px-5 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <div className="flex flex-1 justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleSaveSummary()}
                disabled={busy || !summary}
              >
                Save summary
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSaveAndDraftFollowUp()}
              disabled={busy || !summary || !onSaveAndDraftFollowUp}
            >
              Save and draft follow-up
            </Button>
          </div>
        </div>
    </div>,
    document.body,
  )
}

function SummaryPreview({ summary }: { summary: PostCallSummary }) {
  return (
    <div className="space-y-3">
      {summary.discussed.length > 0 ? (
        <SummaryBulletSection
          title="What was discussed"
          items={summary.discussed}
          variant="discussed"
        />
      ) : null}

      {summary.not_covered && summary.not_covered.length > 0 ? (
        <SummaryBulletSection
          title="Topics not covered"
          items={summary.not_covered}
          variant="not_covered"
        />
      ) : null}

      {summary.commitments.length > 0 ? (
        <SummaryBulletSection title="Commitments" items={summary.commitments} variant="neutral" />
      ) : null}

      {summary.next_steps.length > 0 ? (
        <SummaryBulletSection title="Next steps" items={summary.next_steps} variant="neutral" />
      ) : null}
    </div>
  )
}

function SummaryBulletSection({
  title,
  items,
  variant,
}: {
  title: string
  items: string[]
  variant: "discussed" | "not_covered" | "neutral"
}) {
  const styles =
    variant === "discussed"
      ? {
          box: "border-emerald-200/80 bg-emerald-50/80",
          title: "text-emerald-800",
          text: "text-emerald-950",
        }
      : variant === "not_covered"
        ? {
            box: "border-amber-200/80 bg-amber-50/80",
            title: "text-amber-800",
            text: "text-amber-950",
          }
        : {
            box: "border-border bg-muted/30",
            title: "text-muted-foreground",
            text: "text-foreground",
          }

  return (
    <div className={cn("rounded-md border px-3 py-2.5", styles.box)}>
      <p className={cn("text-[10px] font-semibold uppercase tracking-wide", styles.title)}>
        {title}
      </p>
      <ul className="mt-1 space-y-1">
        {items.map((item, index) => (
          <li
            key={`${index}-${item}`}
            className={cn("flex gap-2 text-[12px] leading-relaxed", styles.text)}
          >
            <span className="shrink-0 text-muted-foreground">-</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
