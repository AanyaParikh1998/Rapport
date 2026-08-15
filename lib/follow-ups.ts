import type { Contact } from "@/lib/data"
import type { DraftOutreachFormat } from "@/lib/draft-outreach-context"
import type { OutreachDraft } from "@/lib/outreach-drafts"
import { getStageDisplayLabel } from "@/lib/stages"

export const FOLLOW_UP_THRESHOLD_DAYS = 7

export type FollowUpSectionId =
  | "not_yet_contacted"
  | "awaiting_response"
  | "ready_to_reconnect"

export type FollowUpItem = {
  contact: Contact
  overdueDays: number
  overdueLabel: string
  sectionId: FollowUpSectionId
}

export type FollowUpSection = {
  id: FollowUpSectionId
  title: string
  items: FollowUpItem[]
}

export const FOLLOW_UP_SECTION_DEFS: {
  id: FollowUpSectionId
  title: string
}[] = [
  { id: "not_yet_contacted", title: "Not yet contacted" },
  { id: "awaiting_response", title: "Awaiting response" },
  { id: "ready_to_reconnect", title: "Ready to reconnect" },
]

export const FOLLOW_UP_COLUMN_COLORS: Record<FollowUpSectionId, string> = {
  not_yet_contacted: "#888780",
  awaiting_response: "#378ADD",
  ready_to_reconnect: "#639922",
}

export const FOLLOW_UP_COLUMN_BORDER: Record<FollowUpSectionId, string> = {
  not_yet_contacted: "border-l-[#888780]",
  awaiting_response: "border-l-[#378ADD]",
  ready_to_reconnect: "border-l-[#639922]",
}

function daysSince(date: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)),
  )
}

function formatOverdueLabel(sectionId: FollowUpSectionId, overdueDays: number): string {
  const dayText = overdueDays === 1 ? "1 day" : `${overdueDays} days`

  switch (sectionId) {
    case "not_yet_contacted":
      return `${dayText} since added`
    case "awaiting_response":
      return `${dayText} since last contacted`
    case "ready_to_reconnect":
      return `${dayText} since last interaction`
  }
}

function isOverdueNotContacted(contact: Contact): FollowUpItem | null {
  if (contact.stage !== "not_contacted" || !contact.createdAt) return null

  const overdueDays = daysSince(contact.createdAt)
  if (overdueDays < FOLLOW_UP_THRESHOLD_DAYS) return null

  return {
    contact,
    overdueDays,
    overdueLabel: formatOverdueLabel("not_yet_contacted", overdueDays),
    sectionId: "not_yet_contacted",
  }
}

function isOverdueInProgress(contact: Contact): FollowUpItem | null {
  if (contact.stage !== "in_progress" || !contact.lastActionAt) return null

  const overdueDays = daysSince(contact.lastActionAt)
  if (overdueDays < FOLLOW_UP_THRESHOLD_DAYS) return null

  return {
    contact,
    overdueDays,
    overdueLabel: formatOverdueLabel("awaiting_response", overdueDays),
    sectionId: "awaiting_response",
  }
}

function isOverdueReadyToReconnect(contact: Contact): FollowUpItem | null {
  if (
    (contact.stage !== "responded" && contact.stage !== "met_connected") ||
    !contact.lastActionAt
  ) {
    return null
  }

  const overdueDays = daysSince(contact.lastActionAt)
  if (overdueDays < FOLLOW_UP_THRESHOLD_DAYS) return null

  return {
    contact,
    overdueDays,
    overdueLabel: formatOverdueLabel("ready_to_reconnect", overdueDays),
    sectionId: "ready_to_reconnect",
  }
}

function sortByMostOverdue(items: FollowUpItem[]): FollowUpItem[] {
  return [...items].sort((a, b) => b.overdueDays - a.overdueDays)
}

export function getFollowUpSections(contacts: Contact[]): FollowUpSection[] {
  const buckets: Record<FollowUpSectionId, FollowUpItem[]> = {
    not_yet_contacted: [],
    awaiting_response: [],
    ready_to_reconnect: [],
  }

  for (const contact of contacts) {
    const item =
      isOverdueNotContacted(contact) ??
      isOverdueInProgress(contact) ??
      isOverdueReadyToReconnect(contact)

    if (item) {
      buckets[item.sectionId].push(item)
    }
  }

  return FOLLOW_UP_SECTION_DEFS.map((section) => ({
    id: section.id,
    title: section.title,
    items: sortByMostOverdue(buckets[section.id]),
  }))
}

export function getFollowUpItems(contacts: Contact[]): FollowUpItem[] {
  return getFollowUpSections(contacts).flatMap((section) => section.items)
}

export function getFollowUpCount(contacts: Contact[]): number {
  return getFollowUpItems(contacts).length
}

export { getStageDisplayLabel }

export type FollowUpSuggestion = {
  label: string
  format: DraftOutreachFormat
}

export function getFollowUpSuggestion(lastDraft: OutreachDraft | null): FollowUpSuggestion {
  if (!lastDraft) {
    return {
      label: "Start with a LinkedIn note or email",
      format: "linkedin_note",
    }
  }

  switch (lastDraft.format) {
    case "email":
      return {
        label: "Try a LinkedIn message this time",
        format: "linkedin_message",
      }
    case "linkedin_note":
      return {
        label: "Try a LinkedIn message or email this time",
        format: "linkedin_message",
      }
    case "linkedin_message":
      return {
        label: "Try an email this time",
        format: "email",
      }
  }
}
