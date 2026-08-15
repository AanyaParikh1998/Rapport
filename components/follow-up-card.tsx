"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Avatar } from "@/components/avatar"
import { Button } from "@/components/ui/button"
import type { DraftOutreachFormat } from "@/lib/draft-outreach-context"
import type { Contact } from "@/lib/data"
import { updateFollowUpNote } from "@/lib/contacts"
import { InteractionTimelineCompact } from "@/components/contact-interactions"
import { FOLLOW_UP_COLUMN_BORDER, type FollowUpSectionId } from "@/lib/follow-ups"
import type { ContactInteraction } from "@/lib/interactions"
import { previewDraftBody, getOutreachDraftButtonLabel, type ContactDraftSummary } from "@/lib/outreach-drafts"
import { hasManualFollowUpInteraction } from "@/lib/interactions"
import { cn } from "@/lib/utils"

const noteInputClassName =
  "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function FollowUpCard({
  contact,
  sectionId,
  overdueLabel,
  draftSummary,
  interactions,
  onDraftOpen,
  onNoteSaved,
}: {
  contact: Contact
  sectionId: FollowUpSectionId
  overdueLabel: string
  draftSummary: ContactDraftSummary
  interactions: ContactInteraction[]
  onDraftOpen: (contact: Contact, initialFormat?: DraftOutreachFormat) => void
  onNoteSaved: (contact: Contact) => void
}) {
  const [noteValue, setNoteValue] = useState(contact.followupNote ?? "")
  const [savedVisible, setSavedVisible] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setNoteValue(contact.followupNote ?? "")
  }, [contact.followupNote, contact.id])

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    }
  }, [])

  async function handleNoteBlur() {
    const trimmed = noteValue.trim()
    const current = (contact.followupNote ?? "").trim()

    if (trimmed === current || savingNote) return

    setSavingNote(true)

    try {
      const updated = await updateFollowUpNote(contact.id, trimmed)
      onNoteSaved(updated)
      setSavedVisible(true)
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      savedTimeoutRef.current = setTimeout(() => setSavedVisible(false), 1000)
    } catch {
      setNoteValue(contact.followupNote ?? "")
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <article
      className={cn(
        "w-full rounded-lg border border-l-[3px] border-solid border-border bg-card p-3",
        FOLLOW_UP_COLUMN_BORDER[sectionId],
      )}
    >
      <div className="flex gap-2.5">
        <Avatar name={contact.name} />

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="truncate text-[13px] font-medium text-foreground">{contact.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{contact.company}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{overdueLabel}</p>
          </div>

          {interactions.length > 0 ? (
            <div className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Recent interactions
              </p>
              <InteractionTimelineCompact interactions={interactions} limit={3} />
            </div>
          ) : null}

          {draftSummary.latestDraft ? (
            <div className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Last draft
              </p>
              {draftSummary.latestDraft.format === "email" && draftSummary.latestDraft.subject ? (
                <p className="mt-1 truncate text-[11px] font-medium text-foreground/90">
                  {draftSummary.latestDraft.subject}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] leading-relaxed text-foreground/80">
                {previewDraftBody(draftSummary.latestDraft.body, 90)}
              </p>
            </div>
          ) : null}

          <div className="relative">
            <input
              type="text"
              value={noteValue}
              onChange={(event) => setNoteValue(event.target.value)}
              onBlur={handleNoteBlur}
              placeholder="Quick note..."
              className={noteInputClassName}
              disabled={savingNote}
            />
            <span
              className={cn(
                "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground transition-opacity duration-300",
                savedVisible ? "opacity-100" : "opacity-0",
              )}
            >
              Saved
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => onDraftOpen(contact)}
            >
              {getOutreachDraftButtonLabel({
                stage: contact.stage,
                hasSentDraft: draftSummary.hasSentDraft,
                hasManualFollowUpInteraction: hasManualFollowUpInteraction(interactions),
                fromFollowUpsPage: true,
              })}
            </Button>
            <Link
              href={`/?contact=${contact.id}`}
              className="text-[11px] font-medium text-primary underline-offset-4 hover:underline"
            >
              View in pipeline
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
