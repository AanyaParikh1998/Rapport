"use client"

import { ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Contact } from "@/lib/data"
import {
  getFirstLinePreview,
  NotesDraftsCollapsibleCard,
} from "@/components/notes-drafts-collapsible"

export function PreCallPrepSection({
  contact,
  onOpenPrepSheet,
}: {
  contact: Contact
  onOpenPrepSheet: () => void
}) {
  const hasPreCallNotes = Boolean(contact.preCallNotes?.trim())
  const preview = contact.preCallNotes
    ? getFirstLinePreview(contact.preCallNotes)
    : null

  return (
    <NotesDraftsCollapsibleCard title="Pre-call prep" preview={preview}>
      <div className="flex flex-col gap-3">
        {!hasPreCallNotes ? (
          <p className="text-[12px] text-muted-foreground">
            Add goals and talking points before your next call.
          </p>
        ) : null}
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={onOpenPrepSheet}
          className="self-start"
        >
          <ClipboardList className="h-3 w-3" data-icon="inline-start" />
          Open prep sheet
        </Button>
      </div>
    </NotesDraftsCollapsibleCard>
  )
}
