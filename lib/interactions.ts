import type { Stage } from "@/lib/data"
import { notifyInteractionsChanged } from "@/lib/interactions-events"
import { supabase } from "@/lib/supabase/client"

export type InteractionType = "auto" | "manual" | "manual_met_connected" | "manual_responded"

export type ManualInteractionKind =
  | "call"
  | "met"
  | "replied"
  | "intro"
  | "call_scheduled"
  | "meeting_scheduled"
  | "email_response"
  | "other"

export type QuickTapColumn = "responded" | "met_connected"

export const QUICK_TAP_KINDS_BY_COLUMN: Record<QuickTapColumn, ManualInteractionKind[]> = {
  responded: ["call_scheduled", "meeting_scheduled"],
  met_connected: ["call", "met", "email_response", "intro", "other"],
}

export type ContactInteraction = {
  id: string
  contactId: string
  createdAt: string
  type: InteractionType
  notes: string
  note: string | null
  manualKind: ManualInteractionKind | null
  draftId: string | null
  summaryDiscussed: string | null
  summaryCommitments: string | null
  summaryFollowups: string | null
  summaryNotCovered: string | null
  rawNotes: string | null
  gmailMessageId: string | null
}

export type InteractionTimelineEntry = {
  id: string
  createdAt: string
  type: InteractionType
  notes: string
  note: string | null
  manualKind: ManualInteractionKind | null
  draftId: string | null
  isGrouped: boolean
  summaryDiscussed: string | null
  summaryCommitments: string | null
  summaryFollowups: string | null
  summaryNotCovered: string | null
  rawNotes: string | null
  gmailMessageId: string | null
}

type ContactInteractionRow = {
  id: string
  contact_id: string
  created_at: string
  type: InteractionType
  notes: string | null
  draft: string | null
  summary_discussed: string | null
  summary_commitments: string | null
  summary_followups: string | null
  not_covered: string | null
  raw_notes: string | null
  gmail_message_id: string | null
}

const NOTE_SEPARATOR = "\n"

export const AUTO_LOG_CONTACT_ADDED = "Contact added"
export const AUTO_LOG_MESSAGE_SENT = "Message sent, awaiting response"
export const AUTO_LOG_THEY_RESPONDED = "They responded"
export const AUTO_LOG_FOLLOW_UP_DRAFTED = "Follow-up drafted"

const ONCE_PER_DAY_MANUAL_NOTES = new Set(["Call scheduled", "Had a call", "Met in person"])

export const INITIAL_CALL_OR_MEETING_NOTES = new Set(["Had a call", "Met in person"])

export const SCHEDULED_CALL_MEETING_NOTES = new Set(["Call scheduled", "Meeting scheduled"])

export const POST_CALL_MEETING_NOTES = new Set([
  "Had a call",
  "Met in person",
  "Had another call",
  "Met again",
])

export function isScheduledCallMeetingEntry(entry: InteractionTimelineEntry): boolean {
  return SCHEDULED_CALL_MEETING_NOTES.has(entry.notes)
}

export function isPostCallMeetingEntry(entry: InteractionTimelineEntry): boolean {
  return POST_CALL_MEETING_NOTES.has(entry.notes)
}

export function contactHasPreCallNotes(contact: { preCallNotes?: string | null }): boolean {
  return Boolean(contact.preCallNotes?.trim())
}

export type QuickTapAction = {
  label: string
  kind: ManualInteractionKind
}

const RESPONDED_QUICK_TAP_ACTIONS: QuickTapAction[] = [
  { label: "Call scheduled", kind: "call_scheduled" },
  { label: "Meeting scheduled", kind: "meeting_scheduled" },
]

const MET_CONNECTED_INITIAL_QUICK_TAP_ACTIONS: QuickTapAction[] = [
  { label: "Had a call", kind: "call" },
  { label: "Met in person", kind: "met" },
  { label: "Email response", kind: "email_response" },
  { label: "Other", kind: "other" },
]

const MET_CONNECTED_FOLLOW_UP_QUICK_TAP_ACTIONS: QuickTapAction[] = [
  { label: "Had another call", kind: "call" },
  { label: "Met again", kind: "met" },
  { label: "Email response", kind: "email_response" },
  { label: "Got an intro", kind: "intro" },
  { label: "Other", kind: "other" },
]

export function hasLoggedInitialCallOrMeeting(
  interactions: ContactInteraction[],
): boolean {
  return interactions.some((interaction) => {
    if (!isManualInteractionType(interaction.type)) return false
    return INITIAL_CALL_OR_MEETING_NOTES.has(interaction.notes)
  })
}

export function hasAnyManualInteractionLogged(
  interactions: ContactInteraction[],
): boolean {
  return interactions.some((interaction) => isManualInteractionType(interaction.type))
}

export function shouldShowBlueTouchpointBar(
  stage: Stage,
  interactions: ContactInteraction[],
): boolean {
  if (stage === "met_connected") return true
  return hasAnyManualInteractionLogged(interactions)
}

export function getQuickTapSection(
  stage: Stage,
  interactions: ContactInteraction[],
): { title: string; actions: QuickTapAction[]; emphasis?: "active" } | null {
  if (stage === "responded") {
    const blueBar = shouldShowBlueTouchpointBar(stage, interactions)

    return {
      title: blueBar ? "Log your next touchpoint" : "Log an interaction",
      actions: RESPONDED_QUICK_TAP_ACTIONS,
      emphasis: blueBar ? "active" : undefined,
    }
  }

  if (stage === "met_connected") {
    return {
      title: "Log your next touchpoint",
      actions: MET_CONNECTED_FOLLOW_UP_QUICK_TAP_ACTIONS,
      emphasis: "active",
    }
  }

  return null
}

export function hasLoggedPostCallMeeting(interactions: ContactInteraction[]): boolean {
  return interactions.some((interaction) => {
    if (!isManualInteractionType(interaction.type)) return false
    return POST_CALL_MEETING_NOTES.has(interaction.notes)
  })
}

export function isFollowUpMessageInteraction(interaction: ContactInteraction): boolean {
  if (!isManualInteractionType(interaction.type)) return false
  if (POST_CALL_MEETING_NOTES.has(interaction.notes)) return false

  if (interaction.manualKind === "other" || interaction.manualKind === "email_response") {
    return true
  }

  if (interaction.notes === "Email response") return true

  return interaction.manualKind === null && !MANUAL_KIND_BY_LABEL[interaction.notes]
}

export function hasLoggedFollowUpMessage(
  interactions: ContactInteraction[],
  hasSentDraft = false,
): boolean {
  if (hasSentDraft) return true

  return interactions.some(isFollowUpMessageInteraction)
}

export function getPostCallMeetingLabel(entry: InteractionTimelineEntry): string {
  if (POST_CALL_MEETING_NOTES.has(entry.notes)) {
    return entry.notes
  }

  if (entry.manualKind === "call") {
    return "Had a call"
  }

  if (entry.manualKind === "met") {
    return "Met in person"
  }

  return entry.notes
}

export function getCallNotesSectionLabel(entry: InteractionTimelineEntry): string {
  if (POST_CALL_MEETING_NOTES.has(entry.notes)) {
    return entry.notes
  }

  if (hasSummaryDiscussed(entry)) {
    return "Had a call"
  }

  return getPostCallMeetingLabel(entry)
}

export function hasSummaryDiscussed(entry: {
  summaryDiscussed?: string | null
}): boolean {
  const value = entry.summaryDiscussed
  return value !== null && value !== undefined && value.trim() !== ""
}

export function getInteractionTimelineLabel(entry: InteractionTimelineEntry): string {
  if (hasSummaryDiscussed(entry)) {
    return "Had a call"
  }

  return entry.notes
}

export function isGmailLoggedTimelineEntry(entry: InteractionTimelineEntry): boolean {
  const notes = entry.notes.trim()
  return notes.startsWith("Email sent:") || notes.startsWith("Email received:")
}

export function getGmailMessageUrl(messageId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(messageId.trim())}`
}

export function isCallNotesTimelineEntry(entry: InteractionTimelineEntry): boolean {
  return hasSummaryDiscussed(entry)
}

export function isFollowUpMessageTimelineEntry(entry: InteractionTimelineEntry): boolean {
  if (hasSummaryDiscussed(entry)) return false
  if (!isManualTimelineEntry(entry)) return false
  if (isPostCallMeetingEntry(entry)) return false

  if (entry.manualKind === "other" || entry.manualKind === "email_response") {
    return true
  }

  if (entry.notes === "Email response") return true

  // Custom "Other" entries store the label in notes, not a preset quick-tap label.
  return entry.manualKind === null && !MANUAL_KIND_BY_LABEL[entry.notes]
}

export function getFollowUpMessageLabel(entry: InteractionTimelineEntry): string {
  if (entry.manualKind === "other") {
    return entry.notes.trim()
  }

  if (entry.manualKind === "email_response" || entry.notes === "Email response") {
    return entry.rawNotes?.trim() || entry.notes
  }

  return entry.notes
}

export function getFollowUpMessageAttachedNote(
  entry: InteractionTimelineEntry,
): string | null {
  const note = entry.note?.trim()
  return note || null
}

export function isEmailResponseFollowUpEntry(entry: InteractionTimelineEntry): boolean {
  return entry.manualKind === "email_response" || entry.notes === "Email response"
}

export async function updateFollowUpMessageText(
  entry: InteractionTimelineEntry,
  text: string,
): Promise<ContactInteraction> {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error("Follow-up message text cannot be empty.")
  }

  if (isEmailResponseFollowUpEntry(entry)) {
    return updateSummarizedManualInteraction({
      id: entry.id,
      rawNotes: trimmed,
    })
  }

  return updateManualInteraction({
    id: entry.id,
    notes: trimmed,
    note: entry.note ?? "",
  })
}

const ONCE_ONLY_AUTO_NOTES = new Set([
  AUTO_LOG_CONTACT_ADDED,
  AUTO_LOG_MESSAGE_SENT,
  AUTO_LOG_THEY_RESPONDED,
])

const MEANINGFUL_AUTO_NOTES = new Set([
  AUTO_LOG_CONTACT_ADDED,
  AUTO_LOG_MESSAGE_SENT,
  AUTO_LOG_THEY_RESPONDED,
  AUTO_LOG_FOLLOW_UP_DRAFTED,
])

const ALWAYS_SEPARATE_AUTO_NOTES = new Set([
  AUTO_LOG_CONTACT_ADDED,
  AUTO_LOG_MESSAGE_SENT,
  AUTO_LOG_THEY_RESPONDED,
  AUTO_LOG_FOLLOW_UP_DRAFTED,
])

function isMeaningfulAutoInteraction(interaction: ContactInteraction): boolean {
  return MEANINGFUL_AUTO_NOTES.has(interaction.notes)
}

function isAlwaysSeparateAutoInteraction(interaction: ContactInteraction): boolean {
  return ALWAYS_SEPARATE_AUTO_NOTES.has(interaction.notes)
}

const FOLLOW_UP_MANUAL_KINDS = new Set<ManualInteractionKind>([
  "call",
  "met",
  "call_scheduled",
  "meeting_scheduled",
  "email_response",
])

export function hasManualFollowUpInteraction(interactions: ContactInteraction[]): boolean {
  return interactions.some(
    (interaction) =>
      interaction.manualKind !== null && FOLLOW_UP_MANUAL_KINDS.has(interaction.manualKind),
  )
}

const MANUAL_KIND_BY_LABEL: Record<string, ManualInteractionKind> = {
  "Had a call": "call",
  "Had another call": "call",
  "Met in person": "met",
  "Met again": "met",
  "They replied": "replied",
  "Got an intro": "intro",
  "Call scheduled": "call_scheduled",
  "Meeting scheduled": "meeting_scheduled",
  "Email response": "email_response",
}

function isManualInteractionType(type: InteractionType): boolean {
  return type === "manual" || type === "manual_met_connected" || type === "manual_responded"
}

async function touchContactLastActionAt(contactId: string): Promise<void> {
  console.log("updating last_action_at for:", contactId)
  const { error } = await supabase
    .from("contacts")
    .update({ last_action_at: new Date().toISOString() })
    .eq("id", contactId)
    .select()
  console.log("last_action_at update error:", error)

  if (error) {
    console.error("Failed to update contact last_action_at:", error.message, error)
    throw error
  }
}

function formatNotesForStorage(notes: string, note?: string | null): string {
  const trimmedNotes = notes.trim()
  const trimmedNote = note?.trim()

  if (!trimmedNote) return trimmedNotes
  return `${trimmedNotes}${NOTE_SEPARATOR}${trimmedNote}`
}

function parseNotesFromStorage(
  storedNotes: string | null,
  type: InteractionType,
): Pick<ContactInteraction, "notes" | "note" | "manualKind"> {
  if (!storedNotes) {
    return { notes: "", note: null, manualKind: null }
  }

  const separatorIndex = storedNotes.indexOf(NOTE_SEPARATOR)
  const notes =
    separatorIndex === -1 ? storedNotes : storedNotes.slice(0, separatorIndex)
  const note =
    separatorIndex === -1 ? null : storedNotes.slice(separatorIndex + 1) || null

  if (type === "auto") {
    return { notes, note: null, manualKind: null }
  }

  if (isManualInteractionType(type)) {
    const manualKind = MANUAL_KIND_BY_LABEL[notes] ?? "other"
    if (type === "manual") {
      return { notes, note, manualKind }
    }
    return { notes, note: null, manualKind }
  }

  return { notes, note: null, manualKind: null }
}

function mapInteractionRow(row: ContactInteractionRow): ContactInteraction {
  const parsed = parseNotesFromStorage(row.notes, row.type)

  return {
    id: row.id,
    contactId: row.contact_id,
    createdAt: row.created_at,
    type: row.type,
    notes: parsed.notes,
    note: parsed.note,
    manualKind: parsed.manualKind,
    draftId: row.draft,
    summaryDiscussed: row.summary_discussed ?? null,
    summaryCommitments: row.summary_commitments ?? null,
    summaryFollowups: row.summary_followups ?? null,
    summaryNotCovered: row.not_covered ?? null,
    rawNotes: row.raw_notes ?? null,
    gmailMessageId: row.gmail_message_id ?? null,
  }
}

export function interactionToTimelineEntry(interaction: ContactInteraction): InteractionTimelineEntry {
  return {
    id: interaction.id,
    createdAt: interaction.createdAt,
    type: interaction.type,
    notes: interaction.notes,
    note: interaction.note,
    manualKind: interaction.manualKind,
    draftId: interaction.draftId,
    isGrouped: false,
    summaryDiscussed: interaction.summaryDiscussed,
    summaryCommitments: interaction.summaryCommitments,
    summaryFollowups: interaction.summaryFollowups,
    summaryNotCovered: interaction.summaryNotCovered,
    rawNotes: interaction.rawNotes,
    gmailMessageId: interaction.gmailMessageId,
  }
}

export function isFollowUpDraftedTimelineEntry(entry: InteractionTimelineEntry): boolean {
  return entry.notes === AUTO_LOG_FOLLOW_UP_DRAFTED
}

export function isManualTimelineEntry(entry: InteractionTimelineEntry): boolean {
  return entry.type !== "auto"
}

export function hasInteractionSummary(entry: InteractionTimelineEntry): boolean {
  return Boolean(
    entry.summaryDiscussed?.trim() ||
      entry.summaryCommitments?.trim() ||
      entry.summaryFollowups?.trim() ||
      entry.summaryNotCovered?.trim(),
  )
}

export function parseBulletItems(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const items: string[] = []

  for (const line of trimmed.split(/\n+/)) {
    let content = line.trim()
    if (!content) continue

    content = content.replace(/^[-•*]\s+/, "")

    if (content.includes(" - ")) {
      for (const part of content.split(/\s+-\s+/)) {
        const item = part.trim()
        if (item) items.push(item)
      }
      continue
    }

    items.push(content)
  }

  return items
}

function getCalendarDayKey(isoDate: string): string {
  const date = new Date(isoDate)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function formatInteractionDayLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(isoDate))
}

export function isInteractionFromToday(
  isoDate: string,
  now: Date = new Date(),
): boolean {
  return getCalendarDayKey(isoDate) === getCalendarDayKey(now.toISOString())
}

export function getQuickTapColumnForStage(stage: Stage): QuickTapColumn | null {
  if (stage === "responded") return "responded"
  if (stage === "met_connected") return "met_connected"
  return null
}

export function getTodayQuickTapEntryForColumn(
  interactions: ContactInteraction[],
  column: QuickTapColumn,
): ContactInteraction | null {
  const kinds = new Set(QUICK_TAP_KINDS_BY_COLUMN[column])

  for (const interaction of interactions) {
    if (!isManualInteractionType(interaction.type)) continue
    if (!isInteractionFromToday(interaction.createdAt)) continue
    if (!interaction.manualKind || !kinds.has(interaction.manualKind)) continue
    return interaction
  }

  return null
}

export function findTodayInteractionWithNotes(
  interactions: ContactInteraction[],
  notes: string,
): ContactInteraction | null {
  const trimmedNotes = notes.trim()
  if (!trimmedNotes) return null

  return (
    interactions.find(
      (interaction) =>
        isManualInteractionType(interaction.type) &&
        isInteractionFromToday(interaction.createdAt) &&
        interaction.notes === trimmedNotes,
    ) ?? null
  )
}

export function buildInteractionTimeline(
  interactions: ContactInteraction[],
): InteractionTimelineEntry[] {
  const groupableAutoByDay = new Map<string, ContactInteraction[]>()

  for (const interaction of interactions) {
    if (interaction.type !== "auto") continue
    if (!isMeaningfulAutoInteraction(interaction)) continue
    if (isAlwaysSeparateAutoInteraction(interaction)) continue

    const dayKey = getCalendarDayKey(interaction.createdAt)
    const dayEntries = groupableAutoByDay.get(dayKey) ?? []
    dayEntries.push(interaction)
    groupableAutoByDay.set(dayKey, dayEntries)
  }

  for (const dayEntries of groupableAutoByDay.values()) {
    dayEntries.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  }

  const consumedGroupableDays = new Set<string>()
  const timeline: InteractionTimelineEntry[] = []

  for (const interaction of interactions) {
    if (interaction.type === "manual" || isManualInteractionType(interaction.type)) {
      timeline.push(interactionToTimelineEntry(interaction))
      continue
    }

    if (!isMeaningfulAutoInteraction(interaction)) continue

    if (isAlwaysSeparateAutoInteraction(interaction)) {
      timeline.push({
        id: interaction.id,
        createdAt: interaction.createdAt,
        type: "auto",
        notes: interaction.notes,
        note: null,
        manualKind: null,
        draftId: interaction.draftId,
        isGrouped: false,
        summaryDiscussed: null,
        summaryCommitments: null,
        summaryFollowups: null,
        summaryNotCovered: null,
        rawNotes: null,
        gmailMessageId: interaction.gmailMessageId,
      })
      continue
    }

    const dayKey = getCalendarDayKey(interaction.createdAt)
    if (consumedGroupableDays.has(dayKey)) continue

    consumedGroupableDays.add(dayKey)
    const dayEntries = groupableAutoByDay.get(dayKey) ?? [interaction]
    const noteTexts = [
      ...new Set(dayEntries.map((entry) => entry.notes).filter(Boolean)),
    ]

    if (noteTexts.length <= 2) {
      for (const entry of [...dayEntries].reverse()) {
        timeline.push({
          id: entry.id,
          createdAt: entry.createdAt,
          type: "auto",
          notes: entry.notes,
          note: null,
          manualKind: null,
          draftId: entry.draftId,
          isGrouped: false,
          summaryDiscussed: null,
          summaryCommitments: null,
          summaryFollowups: null,
          summaryNotCovered: null,
          rawNotes: null,
          gmailMessageId: entry.gmailMessageId,
        })
      }
      continue
    }

    timeline.push({
      id: `auto-${dayKey}`,
      createdAt: dayEntries[dayEntries.length - 1].createdAt,
      type: "auto",
      notes: noteTexts.join(", "),
      note: null,
      manualKind: null,
      draftId: null,
      isGrouped: true,
      summaryDiscussed: null,
      summaryCommitments: null,
      summaryFollowups: null,
      summaryNotCovered: null,
      rawNotes: null,
      gmailMessageId: null,
    })
  }

  return timeline
}

export async function hasInteractionNoteToday(
  contactId: string,
  notes: string,
): Promise<boolean> {
  const trimmedNotes = notes.trim()
  if (!trimmedNotes) return false

  const { data, error } = await supabase
    .from("interactions")
    .select("notes, created_at, type")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data ?? []).some((row) => {
    if (!isInteractionFromToday(row.created_at)) return false
    const parsed = parseNotesFromStorage(row.notes, row.type as InteractionType)
    return parsed.notes === trimmedNotes
  })
}

async function hasAutoInteractionNotes(
  contactId: string,
  notes: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("interactions")
    .select("notes")
    .eq("contact_id", contactId)
    .eq("type", "auto")
    .eq("notes", notes)

  if (error) throw error

  return (data ?? []).length > 0
}

export async function findInteractionNoteToday(
  contactId: string,
  notes: string,
): Promise<ContactInteraction | null> {
  const trimmedNotes = notes.trim()
  if (!trimmedNotes) return null

  const interactions = await fetchInteractionsByContactId(contactId)

  return (
    interactions.find(
      (interaction) =>
        isManualInteractionType(interaction.type) &&
        isInteractionFromToday(interaction.createdAt) &&
        interaction.notes === trimmedNotes,
    ) ?? null
  )
}

export async function findInteractionById(
  contactId: string,
  interactionId: string,
): Promise<ContactInteraction | null> {
  const interactions = await fetchInteractionsByContactId(contactId)
  return interactions.find((interaction) => interaction.id === interactionId) ?? null
}

export async function insertPostCallInteractionRow(input: {
  contactId: string
  stage: Stage
  notes: string
}): Promise<ContactInteraction> {
  const trimmedNotes = input.notes.trim()
  if (!trimmedNotes) {
    throw new Error("Post-call interaction label is required.")
  }

  const type: InteractionType =
    input.stage === "met_connected" ? "manual_met_connected" : "manual_responded"

  return createInteraction({
    contactId: input.contactId,
    type,
    notes: trimmedNotes,
  })
}

/** @deprecated Use insertPostCallInteractionRow for new rows. */
export async function createPostCallInteractionShell(input: {
  contactId: string
  stage: Stage
  notes: string
  existingInteractionId?: string
}): Promise<ContactInteraction> {
  if (input.existingInteractionId) {
    const existing = await findInteractionById(input.contactId, input.existingInteractionId)
    if (existing) return existing
  }

  return insertPostCallInteractionRow(input)
}

export async function createInteraction(input: {
  contactId: string
  type: InteractionType
  notes: string
  note?: string | null
  draftId?: string | null
  rawNotes?: string | null
  gmailMessageId?: string | null
}): Promise<ContactInteraction> {
  const gmailMessageId = input.gmailMessageId?.trim() || null
  const insertData = {
    contact_id: input.contactId,
    type: input.type,
    notes: formatNotesForStorage(input.notes, input.note),
    draft: input.draftId ?? null,
    raw_notes: input.rawNotes?.trim() || null,
    ...(gmailMessageId ? { gmail_message_id: gmailMessageId } : {}),
  }

  const { data, error } = await supabase
    .from("interactions")
    .insert(insertData)
    .select("*")
    .single()

  if (error) {
    console.error("Failed to insert interaction:", error.message, error)
    throw error
  }

  const interaction = mapInteractionRow(data as ContactInteractionRow)
  if (isManualInteractionType(input.type)) {
    await touchContactLastActionAt(input.contactId)
  }
  notifyInteractionsChanged(input.contactId)
  return interaction
}

export async function updateInteractionNote(
  id: string,
  notes: string,
  note: string,
): Promise<ContactInteraction> {
  const { data, error } = await supabase
    .from("interactions")
    .update({ notes: formatNotesForStorage(notes, note) })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error

  const interaction = mapInteractionRow(data as ContactInteractionRow)
  if (isManualInteractionType(interaction.type)) {
    await touchContactLastActionAt(interaction.contactId)
  }
  notifyInteractionsChanged(interaction.contactId)
  return interaction
}

export async function logAutoInteraction(
  contactId: string,
  notes: string,
): Promise<ContactInteraction | null> {
  if (ONCE_ONLY_AUTO_NOTES.has(notes)) {
    const exists = await hasAutoInteractionNotes(contactId, notes)
    if (exists) return null
  }

  return createInteraction({
    contactId,
    type: "auto",
    notes,
  })
}

export async function clearInteractionsForContact(contactId: string): Promise<void> {
  const { error } = await supabase
    .from("interactions")
    .delete()
    .eq("contact_id", contactId)

  if (error) throw error

  notifyInteractionsChanged(contactId)
}

export async function deleteInteraction(id: string, contactId: string): Promise<void> {
  const { error } = await supabase.from("interactions").delete().eq("id", id)

  if (error) throw error

  notifyInteractionsChanged(contactId)
}

export function canDeleteTimelineEntry(entry: InteractionTimelineEntry): boolean {
  return !entry.id.startsWith("auto-")
}

export async function updateManualInteraction(input: {
  id: string
  notes: string
  note?: string | null
}): Promise<ContactInteraction> {
  return updateInteractionNote(
    input.id,
    input.notes,
    input.note?.trim() ?? "",
  )
}

export async function createSummarizedManualInteraction(input: {
  contactId: string
  stage: Stage
  notes: string
  summaryDiscussed?: string | null
  summaryCommitments?: string | null
  summaryFollowups?: string | null
  summaryNotCovered?: string | null
  rawNotes?: string | null
}): Promise<ContactInteraction> {
  const trimmedNotes = input.notes.trim()

  if (ONCE_PER_DAY_MANUAL_NOTES.has(trimmedNotes)) {
    const existing = await findInteractionNoteToday(input.contactId, trimmedNotes)
    if (existing) {
      const hasNewContent = Boolean(
        input.summaryDiscussed?.trim() ||
          input.summaryCommitments?.trim() ||
          input.summaryFollowups?.trim() ||
          input.summaryNotCovered?.trim() ||
          input.rawNotes?.trim(),
      )

      if (hasNewContent) {
        return updateSummarizedManualInteraction({
          id: existing.id,
          stage: input.stage,
          summaryDiscussed: input.summaryDiscussed,
          summaryCommitments: input.summaryCommitments,
          summaryFollowups: input.summaryFollowups,
          summaryNotCovered: input.summaryNotCovered,
          rawNotes: input.rawNotes,
        })
      }

      return existing
    }
  }

  const type: InteractionType =
    input.stage === "met_connected" ? "manual_met_connected" : "manual_responded"

  const { data, error } = await supabase
    .from("interactions")
    .insert({
      contact_id: input.contactId,
      type,
      notes: trimmedNotes,
      summary_discussed: input.summaryDiscussed?.trim() || null,
      summary_commitments: input.summaryCommitments?.trim() || null,
      summary_followups: input.summaryFollowups?.trim() || null,
      not_covered: input.summaryNotCovered?.trim() || null,
      raw_notes: input.rawNotes?.trim() || null,
    })
    .select("*")
    .single()

  if (error) {
    console.error("Failed to insert summarized interaction:", error.message, error)
    throw error
  }

  const interaction = mapInteractionRow(data as ContactInteractionRow)
  await touchContactLastActionAt(input.contactId)
  notifyInteractionsChanged(input.contactId)
  return interaction
}

export async function updateSummarizedManualInteraction(input: {
  id: string
  stage?: Stage
  summaryDiscussed?: string | null
  summaryCommitments?: string | null
  summaryFollowups?: string | null
  summaryNotCovered?: string | null
  rawNotes?: string | null
  touchLastActionAt?: boolean
}): Promise<ContactInteraction> {
  const updatePayload: Record<string, unknown> = {
    summary_discussed: input.summaryDiscussed?.trim() || null,
    summary_commitments: input.summaryCommitments?.trim() || null,
    summary_followups: input.summaryFollowups?.trim() || null,
    not_covered: input.summaryNotCovered?.trim() || null,
    raw_notes: input.rawNotes?.trim() || null,
  }

  if (input.stage) {
    updatePayload.type =
      input.stage === "met_connected" ? "manual_met_connected" : "manual_responded"
  }

  const { data, error } = await supabase
    .from("interactions")
    .update(updatePayload)
    .eq("id", input.id)
    .select("*")
    .single()

  if (error) {
    console.error("Failed to update summarized interaction:", error.message, error)
    throw error
  }

  const interaction = mapInteractionRow(data as ContactInteractionRow)
  if (input.touchLastActionAt !== false) {
    await touchContactLastActionAt(interaction.contactId)
  }
  notifyInteractionsChanged(interaction.contactId)
  return interaction
}

export async function clearInteractionNotes(id: string): Promise<ContactInteraction> {
  return updateSummarizedManualInteraction({
    id,
    summaryDiscussed: null,
    summaryCommitments: null,
    summaryFollowups: null,
    summaryNotCovered: null,
    rawNotes: null,
    touchLastActionAt: false,
  })
}

export async function logManualInteraction(input: {
  contactId: string
  notes: string
  stage?: Stage
  rawNotes?: string | null
  gmailMessageId?: string | null
}): Promise<ContactInteraction> {
  const type: InteractionType =
    input.stage === "met_connected"
      ? "manual_met_connected"
      : input.stage === "responded"
        ? "manual_responded"
        : "manual"

  return createInteraction({
    contactId: input.contactId,
    type,
    notes: input.notes,
    rawNotes: input.rawNotes,
    gmailMessageId: input.gmailMessageId,
  })
}

export async function fetchInteractionsByContactId(
  contactId: string,
): Promise<ContactInteraction[]> {
  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data as ContactInteractionRow[]).map(mapInteractionRow)
}

export function getInteractionCalendarDayKey(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString("en-CA")
  }

  return date.toLocaleDateString("en-CA")
}

export async function hasEmailSentInteractionOnCalendarDay(
  contactId: string,
  emailDateIso: string,
): Promise<boolean> {
  const calendarDay = getInteractionCalendarDayKey(emailDateIso)
  const interactions = await fetchInteractionsByContactId(contactId)

  return interactions.some((interaction) => {
    if (getInteractionCalendarDayKey(interaction.createdAt) !== calendarDay) {
      return false
    }

    return interaction.notes.trim() === "Email sent"
  })
}

export async function hasInteractionNoteOnCalendarDay(
  contactId: string,
  note: string,
  referenceDateIso: string,
): Promise<boolean> {
  const calendarDay = getInteractionCalendarDayKey(referenceDateIso)
  const normalizedNote = note.trim()
  const interactions = await fetchInteractionsByContactId(contactId)

  return interactions.some(
    (interaction) =>
      getInteractionCalendarDayKey(interaction.createdAt) === calendarDay &&
      interaction.notes.trim() === normalizedNote,
  )
}

export async function fetchLatestInteractionAtByContactId(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("interactions").select("contact_id, created_at")

  if (error) throw error

  const latestByContactId = new Map<string, string>()
  for (const row of data ?? []) {
    const contactId = row.contact_id as string
    const createdAt = row.created_at as string
    const existing = latestByContactId.get(contactId)
    if (!existing || createdAt > existing) {
      latestByContactId.set(contactId, createdAt)
    }
  }

  return latestByContactId
}

export async function fetchInteractionsByContactIds(
  contactIds: string[],
): Promise<Map<string, ContactInteraction[]>> {
  const grouped = new Map<string, ContactInteraction[]>()

  for (const contactId of contactIds) {
    grouped.set(contactId, [])
  }

  if (contactIds.length === 0) return grouped

  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .in("contact_id", contactIds)
    .order("created_at", { ascending: false })

  if (error) throw error

  for (const row of (data ?? []) as ContactInteractionRow[]) {
    const interaction = mapInteractionRow(row)
    const existing = grouped.get(interaction.contactId) ?? []
    existing.push(interaction)
    grouped.set(interaction.contactId, existing)
  }

  return grouped
}

export async function logMessageSentInteraction(contactId: string): Promise<void> {
  await logAutoInteraction(contactId, AUTO_LOG_MESSAGE_SENT)
}

export async function logTheyRespondedInteraction(contactId: string): Promise<void> {
  await logAutoInteraction(contactId, AUTO_LOG_THEY_RESPONDED)
}

export async function logContactAddedInteraction(contactId: string): Promise<void> {
  await logAutoInteraction(contactId, AUTO_LOG_CONTACT_ADDED)
}

export async function logFollowUpDraftedInteraction(
  contactId: string,
): Promise<ContactInteraction> {
  return createInteraction({
    contactId,
    type: "auto",
    notes: AUTO_LOG_FOLLOW_UP_DRAFTED,
  })
}
