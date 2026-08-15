"use client"

import { FollowUpCard } from "@/components/follow-up-card"
import type { Contact } from "@/lib/data"
import {
  FOLLOW_UP_COLUMN_COLORS,
  type FollowUpSection,
} from "@/lib/follow-ups"
import type { ContactDraftSummary } from "@/lib/outreach-drafts"
import type { ContactInteraction } from "@/lib/interactions"
import type { DraftOutreachFormat } from "@/lib/draft-outreach-context"

const EMPTY_DRAFT_SUMMARY: ContactDraftSummary = {
  latestDraft: null,
  draftCount: 0,
  earliestDraftAt: null,
  hasSentDraft: false,
}

export function FollowUpsKanban({
  sections,
  draftSummaries,
  interactionMap,
  onDraftOpen,
  onNoteSaved,
}: {
  sections: FollowUpSection[]
  draftSummaries: Map<string, ContactDraftSummary>
  interactionMap: Map<string, ContactInteraction[]>
  onDraftOpen: (contact: Contact, initialFormat?: DraftOutreachFormat) => void
  onNoteSaved: (contact: Contact) => void
}) {
  return (
    <div className="grid h-full grid-cols-3 gap-4 p-5">
      {sections.map((section) => (
        <FollowUpKanbanColumn
          key={section.id}
          title={section.title}
          headerColor={FOLLOW_UP_COLUMN_COLORS[section.id]}
          count={section.items.length}
        >
          {section.items.map(({ contact, overdueLabel }) => (
            <FollowUpCard
              key={contact.id}
              contact={contact}
              sectionId={section.id}
              overdueLabel={overdueLabel}
              draftSummary={draftSummaries.get(contact.id) ?? EMPTY_DRAFT_SUMMARY}
              interactions={interactionMap.get(contact.id) ?? []}
              onDraftOpen={onDraftOpen}
              onNoteSaved={onNoteSaved}
            />
          ))}
        </FollowUpKanbanColumn>
      ))}
    </div>
  )
}

function FollowUpKanbanColumn({
  title,
  headerColor,
  count,
  children,
}: {
  title: string
  headerColor: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <h2
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: headerColor }}
        >
          {title}
        </h2>
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium text-muted-foreground">
          {count}
        </span>
      </div>

      <div className="flex min-h-[240px] flex-col gap-2.5 rounded-lg p-1">
        {children}
        {count === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
            No contacts
          </p>
        ) : null}
      </div>
    </section>
  )
}
