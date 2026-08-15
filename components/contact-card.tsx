"use client"

import { useState } from "react"
import { AlertTriangle, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Contact, Stage } from "@/lib/data"
import {
  formatLastEmailedLabel,
  shouldShowLastEmailedOnCard,
} from "@/lib/contacts"
import { STAGE_LEFT_BORDER } from "@/lib/stages"
import { Avatar } from "@/components/avatar"
import { TagPill } from "@/components/tag-pill"
import { RelationshipScoreBadge } from "@/components/relationship-score-badge"
import { Button } from "@/components/ui/button"

const STAGE_LEFT_BORDER_COLORS = STAGE_LEFT_BORDER

function cardShellClassName(stage: Stage, selected: boolean, extra?: string) {
  return cn(
    "w-full rounded-lg border border-l-[3px] border-solid bg-card",
    selected
      ? "border-primary/60 bg-primary/5 ring-1 ring-primary/20"
      : "border-border",
    STAGE_LEFT_BORDER_COLORS[stage],
    extra,
  )
}

export function ContactCard({
  contact,
  selected,
  onSelect,
  onEdit,
  onDelete,
  contacts,
  dragOverlay = false,
  calendarBannerContactIds,
}: {
  contact: Contact
  selected: boolean
  onSelect: () => void
  onEdit: (contact: Contact) => void
  onDelete: (id: string) => Promise<void>
  contacts: Contact[]
  dragOverlay?: boolean
  calendarBannerContactIds?: Set<string>
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirmDelete() {
    setDeleting(true)
    setError(null)

    try {
      await onDelete(contact.id)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String(err.message)
            : "Failed to delete contact",
      )
      setDeleting(false)
    }
  }

  if (confirming) {
    return (
      <div className={cardShellClassName(contact.stage, selected, "p-3")}>
        <p className="text-[13px] font-medium text-foreground">Delete this contact?</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {contact.name} will be removed from your pipeline.
        </p>

        {error ? (
          <p className="mt-2 text-[11px] text-destructive">{error}</p>
        ) : null}

        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            size="xs"
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Confirm"}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => {
              setConfirming(false)
              setError(null)
            }}
            disabled={deleting}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cardShellClassName(contact.stage, selected, cn("group relative transition-all hover:shadow-sm", dragOverlay && "shadow-md"))}>
      <button
        type="button"
        aria-label={`Edit ${contact.name}`}
        onClick={(event) => {
          event.stopPropagation()
          onEdit(contact)
        }}
        className="absolute top-2 left-2 z-10 flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        aria-label={`Delete ${contact.name}`}
        onClick={(event) => {
          event.stopPropagation()
          setConfirming(true)
        }}
        className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <button type="button" onClick={onSelect} className="w-full px-8 py-3 text-left">
        <div className="flex items-start gap-2.5">
          <Avatar name={contact.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium leading-tight text-foreground">
              {contact.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{contact.company}</p>
          </div>
          {contact.followUpOverdue && !calendarBannerContactIds?.has(contact.id) ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          ) : null}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1">
          {contact.tags.map((tag) => (
            <TagPill key={tag.label} tag={tag} />
          ))}
          {contact.mutualCount && contact.mutualCount > 0 ? (
            <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {contact.mutualCount} mutual{contact.mutualCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        <div className="mt-2.5 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground">{contact.daysLabel}</p>
            {shouldShowLastEmailedOnCard(contact) ? (
              <p className="text-[11px] text-muted-foreground">
                Emailed {formatLastEmailedLabel(contact.lastEmailedAt!)}
              </p>
            ) : null}
          </div>
          <RelationshipScoreBadge contact={contact} contacts={contacts} />
        </div>
      </button>
    </div>
  )
}
