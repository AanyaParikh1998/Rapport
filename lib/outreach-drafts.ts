import { supabase } from "@/lib/supabase/client"
import {
  formatDraftOutreachLabel,
  type DraftOutreachFormat,
} from "@/lib/draft-outreach-context"
import type { Stage } from "@/lib/data"
import { isSuccessfulOutreachStage } from "@/lib/stages"

export type OutreachDraftFormat = DraftOutreachFormat

export type OutreachDraft = {
  id: string
  contactId: string
  format: OutreachDraftFormat
  profileId: string | null
  subject: string | null
  body: string
  status: string
  wasSuccessful: boolean
  createdAt: string
  sentAt: string | null
}

export type OutreachDraftRow = {
  id: string
  contact_id: string
  format: string
  profile_id: string | null
  subject: string | null
  body: string
  status: string
  was_successful: boolean | null
  created_at: string
  sent_at: string | null
}

export type OutreachDraftInput = {
  contactId: string
  format: OutreachDraftFormat
  profileId: string | null
  subject: string | null
  body: string
}

function normalizeFormat(format: string): OutreachDraftFormat {
  if (format === "linkedin_note") return "linkedin_note"
  if (format === "linkedin_message" || format === "linkedin") return "linkedin_message"
  return "email"
}

function mapOutreachDraftRow(row: OutreachDraftRow): OutreachDraft {
  return {
    id: row.id,
    contactId: row.contact_id,
    format: normalizeFormat(row.format),
    profileId: row.profile_id ?? null,
    subject: row.subject,
    body: row.body,
    status: row.status,
    wasSuccessful: row.was_successful ?? false,
    createdAt: row.created_at,
    sentAt: row.sent_at ?? null,
  }
}

export function hasSentDraft(drafts: OutreachDraft[]): boolean {
  return drafts.some((draft) => draft.sentAt !== null)
}

export function isFollowUpOutreachDraft(params: {
  stage: Stage
  hasSentDraft: boolean
  hasManualFollowUpInteraction: boolean
  fromFollowUpsPage?: boolean
}): boolean {
  const { stage, hasSentDraft, hasManualFollowUpInteraction, fromFollowUpsPage } = params

  if (stage === "in_progress" && hasSentDraft) return true
  if ((stage === "responded" || stage === "met_connected") && hasManualFollowUpInteraction) {
    return true
  }
  if (fromFollowUpsPage && hasSentDraft) return true

  return false
}

export function getOutreachDraftButtonLabel(params: {
  stage: Stage
  hasSentDraft: boolean
  hasManualFollowUpInteraction?: boolean
  fromFollowUpsPage?: boolean
}): string {
  const isFollowUp = isFollowUpOutreachDraft({
    stage: params.stage,
    hasSentDraft: params.hasSentDraft,
    hasManualFollowUpInteraction: params.hasManualFollowUpInteraction ?? false,
    fromFollowUpsPage: params.fromFollowUpsPage,
  })

  if (isFollowUp) {
    return "Draft follow-up message"
  }

  return "Draft outreach message"
}

export function previewDraftBody(body: string, maxLength = 80): string {
  const collapsed = body.replace(/\s+/g, " ").trim()
  if (collapsed.length <= maxLength) return collapsed
  return `${collapsed.slice(0, maxLength)}...`
}

export function formatDraftDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoDate))
}

export function formatDraftTypeLabel(format: OutreachDraftFormat): string {
  return formatDraftOutreachLabel(format)
}

export function isDraftMarkedSuccessful(draft: OutreachDraft, stage: Stage): boolean {
  return isSuccessfulOutreachStage(stage) && draft.status === "draft"
}

export function applyDraftSuccessForStage(
  drafts: OutreachDraft[],
  stage: Stage,
): OutreachDraft[] {
  return drafts.map((draft) => ({
    ...draft,
    wasSuccessful: isDraftMarkedSuccessful(draft, stage),
  }))
}

export async function fetchOutreachDraftsByContactId(
  contactId: string,
): Promise<OutreachDraft[]> {
  const { data, error } = await supabase
    .from("outreach_drafts")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data as OutreachDraftRow[]).map(mapOutreachDraftRow)
}

export async function fetchLatestSentDraft(contactId: string): Promise<OutreachDraft | null> {
  const { data, error } = await supabase
    .from("outreach_drafts")
    .select("*")
    .eq("contact_id", contactId)
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return mapOutreachDraftRow(data as OutreachDraftRow)
}

export async function markOutreachDraftSent(id: string): Promise<OutreachDraft> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("outreach_drafts")
    .update({ sent_at: now })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error

  return mapOutreachDraftRow(data as OutreachDraftRow)
}

export type ContactDraftSummary = {
  latestDraft: OutreachDraft | null
  draftCount: number
  earliestDraftAt: string | null
  hasSentDraft: boolean
}

export async function fetchDraftSummariesByContactIds(
  contactIds: string[],
): Promise<Map<string, ContactDraftSummary>> {
  const summaries = new Map<string, ContactDraftSummary>()

  for (const contactId of contactIds) {
    summaries.set(contactId, {
      latestDraft: null,
      draftCount: 0,
      earliestDraftAt: null,
      hasSentDraft: false,
    })
  }

  if (contactIds.length === 0) return summaries

  const { data, error } = await supabase
    .from("outreach_drafts")
    .select("*")
    .in("contact_id", contactIds)
    .order("created_at", { ascending: false })

  if (error) throw error

  const grouped = new Map<string, OutreachDraft[]>()

  for (const row of (data ?? []) as OutreachDraftRow[]) {
    const draft = mapOutreachDraftRow(row)
    const existing = grouped.get(draft.contactId) ?? []
    existing.push(draft)
    grouped.set(draft.contactId, existing)
  }

  for (const [contactId, drafts] of grouped) {
    summaries.set(contactId, {
      latestDraft: drafts[0] ?? null,
      draftCount: drafts.length,
      earliestDraftAt: drafts[drafts.length - 1]?.createdAt ?? null,
      hasSentDraft: drafts.some((draft) => draft.sentAt !== null),
    })
  }

  return summaries
}

export async function createOutreachDraft(input: OutreachDraftInput): Promise<OutreachDraft> {
  const { data, error } = await supabase
    .from("outreach_drafts")
    .insert({
      contact_id: input.contactId,
      format: input.format,
      profile_id: input.profileId,
      subject: input.subject?.trim() || null,
      body: input.body.trim(),
      status: "draft",
    })
    .select("*")
    .single()

  if (error) throw error

  const draft = mapOutreachDraftRow(data as OutreachDraftRow)

  return draft
}

export async function updateOutreachDraft(
  id: string,
  input: Omit<OutreachDraftInput, "contactId">,
): Promise<OutreachDraft> {
  const { data, error } = await supabase
    .from("outreach_drafts")
    .update({
      format: input.format,
      profile_id: input.profileId,
      subject: input.subject?.trim() || null,
      body: input.body.trim(),
    })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error

  return mapOutreachDraftRow(data as OutreachDraftRow)
}

export async function deleteOutreachDraft(id: string): Promise<void> {
  const { error } = await supabase.from("outreach_drafts").delete().eq("id", id)

  if (error) throw error
}

export async function syncContactDraftSuccessStatus(
  contactId: string,
  stage: Stage,
): Promise<void> {
  if (isSuccessfulOutreachStage(stage)) {
    const { error } = await supabase
      .from("outreach_drafts")
      .update({ was_successful: true })
      .eq("contact_id", contactId)
      .eq("status", "draft")

    if (error) throw error
    return
  }

  const { error } = await supabase
    .from("outreach_drafts")
    .update({ was_successful: false })
    .eq("contact_id", contactId)

  if (error) throw error
}
