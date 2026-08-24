import type { Contact, Stage, Tag } from "@/lib/data"
import {
  parsePreCallTalkingPoints,
  type PreCallTalkingPoints,
} from "@/lib/post-call-context"
import { normalizeCityName } from "@/lib/cities"
import { FOLLOW_UP_THRESHOLD_DAYS } from "@/lib/follow-ups"
import {
  logContactAddedInteraction,
  logMessageSentInteraction,
  logTheyRespondedInteraction,
  fetchLatestInteractionAtByContactId,
} from "@/lib/interactions"
import { markOutreachDraftSent, syncContactDraftSuccessStatus } from "@/lib/outreach-drafts"
import { getStageLabelPrefix, normalizeStage } from "@/lib/stages"
import { getDefaultTrackCalendar } from "@/lib/track-calendar"
import { supabase } from "@/lib/supabase/client"

export type ContactRow = {
  id: string
  name: string
  company: string
  role: string
  prior_company: string | null
  prior_role: string | null
  goal: string
  source: string
  connection_type: string
  status: string
  notes: string | null
  location: string | null
  city: string | null
  undergraduate_university: string | null
  graduate_university: string | null
  linkedin_url: string | null
  email: string | null
  mutual_count: number | null
  created_at: string
  last_action_at: string | null
  last_emailed_at: string | null
  followup_note: string | null
  pre_call_notes: string | null
  pre_call_talking_points: PreCallTalkingPoints | string | null
  track_calendar: boolean | null
}

export type NewContactInput = {
  name: string
  company: string
  role: string
  priorCompany: string
  priorRole: string
  city: string
  undergraduateUniversity: string
  graduateUniversity: string
  goal: string
  source: string
  connectionType: string
  notes: string
  linkedinUrl: string
  email: string
  mutualCount: number | null
  trackCalendar?: boolean
}

export type EditContactInput = {
  name: string
  company: string
  role: string
  priorCompany: string
  priorRole: string
  city: string
  undergraduateUniversity: string
  graduateUniversity: string
  goal: string
  source: string
  connectionType: string
  notes: string
  linkedinUrl: string
  email: string
  mutualCount: number | null
  trackCalendar: boolean
}

function resolveTrackCalendar(row: ContactRow): boolean {
  if (typeof row.track_calendar === "boolean") {
    return row.track_calendar
  }

  return getDefaultTrackCalendar(row.connection_type)
}

function connectionTypeToTag(connectionType: string): Tag {
  const tone =
    connectionType === "Cold" ? "cold" : connectionType === "Hot" ? "warm" : "warm"

  return { label: connectionType, tone }
}

function getStageReferenceDate(
  stage: Stage,
  createdAt: string,
  lastActionAt: string | null,
): string {
  if (stage === "not_contacted") {
    return createdAt
  }

  return lastActionAt ?? createdAt
}

function formatDaysLabel(stage: Stage, referenceDate: string): { daysAgo: number; daysLabel: string } {
  const daysAgo = daysSince(referenceDate)
  const stagePrefix = getStageLabelPrefix(stage)
  const daysLabel =
    daysAgo === 0 ? `${stagePrefix} today` : `${stagePrefix} ${daysAgo}d ago`

  return { daysAgo, daysLabel }
}

function daysSince(date: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)),
  )
}

function getFollowUpStatus(
  status: Stage,
  createdAt: string,
  lastActionAt: string | null,
): {
  followUpOverdue: boolean
  followUpNote?: string
} {
  if (status === "not_contacted") {
    const daysSinceAdded = daysSince(createdAt)
    if (daysSinceAdded >= FOLLOW_UP_THRESHOLD_DAYS) {
      return {
        followUpOverdue: true,
        followUpNote: `Added ${daysSinceAdded} days ago. Consider reaching out.`,
      }
    }
    return { followUpOverdue: false }
  }

  if (!lastActionAt) {
    return { followUpOverdue: false }
  }

  const daysSinceLastAction = daysSince(lastActionAt)

  if (daysSinceLastAction < FOLLOW_UP_THRESHOLD_DAYS) {
    return { followUpOverdue: false }
  }

  const notePrefix =
    status === "in_progress"
      ? "Last contacted"
      : status === "responded" || status === "met_connected"
        ? "Last interaction"
        : "No activity in"

  return {
    followUpOverdue: true,
    followUpNote:
      status === "in_progress" || status === "responded" || status === "met_connected"
        ? `${notePrefix} ${daysSinceLastAction} days ago. Consider sending a follow-up.`
        : `No activity in ${daysSinceLastAction} days. Consider sending a follow-up.`,
  }
}

export function getEffectiveLastActionAt(
  lastActionAt: string | null | undefined,
  latestInteractionAt: string | null | undefined,
): string | null {
  const storedLastAction = lastActionAt?.trim() || null
  const interactionLastAction = latestInteractionAt?.trim() || null

  if (!storedLastAction && !interactionLastAction) return null
  if (!storedLastAction) return interactionLastAction
  if (!interactionLastAction) return storedLastAction

  return new Date(interactionLastAction) > new Date(storedLastAction)
    ? interactionLastAction
    : storedLastAction
}

export function applyLatestInteractionToContact(
  contact: Contact,
  latestInteractionAt?: string | null,
): Contact {
  const effectiveLastActionAt = getEffectiveLastActionAt(
    contact.lastActionAt ?? null,
    latestInteractionAt,
  )
  const createdAt = contact.createdAt ?? new Date().toISOString()
  const referenceDate = getStageReferenceDate(
    contact.stage,
    createdAt,
    effectiveLastActionAt,
  )
  const { daysAgo, daysLabel } = formatDaysLabel(contact.stage, referenceDate)
  const lastActionStatus = getFollowUpStatus(
    contact.stage,
    createdAt,
    effectiveLastActionAt,
  )

  return {
    ...contact,
    lastActionAt: effectiveLastActionAt,
    daysAgo,
    daysLabel,
    ...lastActionStatus,
  }
}

export function mapContactRowToContact(
  row: ContactRow,
  options?: { latestInteractionAt?: string | null },
): Contact {
  const stage = normalizeStage(row.status)
  const effectiveLastActionAt = getEffectiveLastActionAt(
    row.last_action_at,
    options?.latestInteractionAt,
  )
  const referenceDate = getStageReferenceDate(stage, row.created_at, effectiveLastActionAt)
  const { daysAgo, daysLabel } = formatDaysLabel(stage, referenceDate)
  const lastActionStatus = getFollowUpStatus(stage, row.created_at, effectiveLastActionAt)

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    company: row.company,
    priorCompany: row.prior_company ?? "",
    priorRole: row.prior_role ?? "",
    city: normalizeCityName(row.city) || normalizeCityName(row.location),
    undergraduateUniversity: row.undergraduate_university ?? "",
    graduateUniversity: row.graduate_university ?? "",
    stage,
    tags: [connectionTypeToTag(row.connection_type)],
    daysAgo,
    daysLabel,
    connectionType: row.connection_type,
    source: row.source,
    goal: row.goal,
    notes: row.notes ?? "",
    linkedinUrl: row.linkedin_url ?? "",
    email: row.email ?? "",
    mutualCount: row.mutual_count,
    lastActionAt: effectiveLastActionAt,
    lastEmailedAt: row.last_emailed_at ?? null,
    createdAt: row.created_at,
    followupNote: row.followup_note,
    preCallNotes: row.pre_call_notes ?? "",
    preCallTalkingPoints: parsePreCallTalkingPoints(row.pre_call_talking_points),
    trackCalendar: resolveTrackCalendar(row),
    ...lastActionStatus,
  }
}

export async function fetchContacts(): Promise<Contact[]> {
  const [{ data, error }, latestInteractionAtByContactId] = await Promise.all([
    supabase.from("contacts").select("*").order("created_at", { ascending: false }),
    fetchLatestInteractionAtByContactId(),
  ])

  if (error) throw error

  return (data as ContactRow[]).map((row) =>
    mapContactRowToContact(row, {
      latestInteractionAt: latestInteractionAtByContactId.get(row.id) ?? null,
    }),
  )
}

export async function fetchContactById(id: string): Promise<Contact | null> {
  const [{ data, error }, { data: latestInteraction, error: interactionError }] =
    await Promise.all([
      supabase.from("contacts").select("*").eq("id", id).single(),
      supabase
        .from("interactions")
        .select("created_at")
        .eq("contact_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  if (error) return null
  if (interactionError) throw interactionError

  return mapContactRowToContact(data as ContactRow, {
    latestInteractionAt: latestInteraction?.created_at ?? null,
  })
}

export function applyOptimisticLastActionTouch(contact: Contact): Contact {
  const now = new Date().toISOString()
  const lastActionStatus = getFollowUpStatus(contact.stage, contact.createdAt ?? now, now)
  const referenceDate = getStageReferenceDate(
    contact.stage,
    contact.createdAt ?? now,
    now,
  )
  const { daysAgo, daysLabel } = formatDaysLabel(contact.stage, referenceDate)

  return {
    ...contact,
    lastActionAt: now,
    daysAgo,
    daysLabel,
    ...lastActionStatus,
  }
}

export async function createContact(input: NewContactInput): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: input.name.trim(),
      company: input.company.trim(),
      role: input.role.trim(),
      prior_company: input.priorCompany.trim() || null,
      prior_role: input.priorRole.trim() || null,
      city: input.city.trim() || null,
      undergraduate_university: input.undergraduateUniversity.trim() || null,
      graduate_university: input.graduateUniversity.trim() || null,
      goal: input.goal,
      source: input.source,
      connection_type: input.connectionType,
      notes: input.notes.trim() || null,
      linkedin_url: input.linkedinUrl.trim() || null,
      email: input.email.trim() || null,
      mutual_count: input.mutualCount,
      track_calendar:
        input.trackCalendar ?? getDefaultTrackCalendar(input.connectionType),
      status: "not_contacted",
    })
    .select("*")
    .single()

  if (error) throw error

  const contact = mapContactRowToContact(data as ContactRow)

  try {
    await logContactAddedInteraction(contact.id)
  } catch (interactionError) {
    console.error("Failed to log contact added interaction:", interactionError)
  }

  return contact
}

export async function updateContact(id: string, input: EditContactInput): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .update({
      name: input.name.trim(),
      company: input.company.trim(),
      role: input.role.trim(),
      prior_company: input.priorCompany.trim() || null,
      prior_role: input.priorRole.trim() || null,
      city: input.city.trim() || null,
      undergraduate_university: input.undergraduateUniversity.trim() || null,
      graduate_university: input.graduateUniversity.trim() || null,
      goal: input.goal,
      source: input.source,
      connection_type: input.connectionType,
      notes: input.notes.trim() || null,
      linkedin_url: input.linkedinUrl.trim() || null,
      email: input.email.trim() || null,
      mutual_count: input.mutualCount,
      track_calendar: input.trackCalendar,
    })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error

  return mapContactRowToContact(data as ContactRow)
}

export async function updateTrackCalendar(
  id: string,
  trackCalendar: boolean,
): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .update({ track_calendar: trackCalendar })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error

  return mapContactRowToContact(data as ContactRow)
}

export function formatLastEmailedLabel(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

export function shouldShowLastEmailedOnCard(contact: Contact): boolean {
  if (!contact.lastEmailedAt) return false
  if (!contact.lastActionAt) return true

  return new Date(contact.lastEmailedAt).getTime() > new Date(contact.lastActionAt).getTime()
}

export async function updateContactLastEmailedAt(
  id: string,
  emailedAt: string,
): Promise<Contact> {
  const parsed = new Date(emailedAt)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("updateContactLastEmailedAt: invalid emailedAt")
  }

  const { data, error } = await supabase
    .from("contacts")
    .update({ last_emailed_at: parsed.toISOString() })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error

  return mapContactRowToContact(data as ContactRow)
}

export function applyOptimisticStageChange(contact: Contact, stage: Stage): Contact {
  const now = new Date().toISOString()
  const lastActionAt = stage === "not_contacted" ? contact.lastActionAt : now
  const referenceDate = getStageReferenceDate(
    stage,
    contact.createdAt ?? now,
    lastActionAt ?? null,
  )
  const { daysLabel } = formatDaysLabel(stage, referenceDate)

  return {
    ...contact,
    stage,
    lastActionAt: stage === "not_contacted" ? contact.lastActionAt : now,
    daysAgo: daysSince(referenceDate),
    followUpOverdue: false,
    followUpNote: undefined,
    daysLabel,
  }
}

export async function moveContactStage(
  id: string,
  stage: Stage,
  options?: { logMessageSent?: boolean; sentDraftId?: string | null },
): Promise<Contact> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("contacts")
    .update({
      status: stage,
      last_action_at: now,
    })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error

  await syncContactDraftSuccessStatus(id, stage)

  if (options?.sentDraftId) {
    await markOutreachDraftSent(options.sentDraftId)
  }

  if (options?.logMessageSent) {
    try {
      await logMessageSentInteraction(id)
    } catch (interactionError) {
      console.error("Failed to log message sent interaction:", interactionError)
    }
  }

  if (stage === "responded") {
    try {
      await logTheyRespondedInteraction(id)
    } catch (interactionError) {
      console.error("Failed to log they responded interaction:", interactionError)
    }
  }

  return mapContactRowToContact(data as ContactRow)
}

export async function updatePreCallTalkingPoints(
  id: string,
  talkingPoints: PreCallTalkingPoints | null,
): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .update({
      pre_call_talking_points: talkingPoints,
    })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error

  return mapContactRowToContact(data as ContactRow)
}

export type PreCallPrepData = {
  preCallNotes: string
  preCallTalkingPoints: PreCallTalkingPoints | null
}

export async function fetchPreCallPrepData(contactId: string): Promise<PreCallPrepData> {
  const { data, error } = await supabase
    .from("contacts")
    .select("pre_call_notes, pre_call_talking_points")
    .eq("id", contactId)
    .single()

  if (error) throw error

  return {
    preCallNotes:
      typeof data?.pre_call_notes === "string" ? data.pre_call_notes : "",
    preCallTalkingPoints: parsePreCallTalkingPoints(data?.pre_call_talking_points),
  }
}

export async function fetchPreCallNotes(contactId: string): Promise<string> {
  const { preCallNotes } = await fetchPreCallPrepData(contactId)
  return preCallNotes
}

export async function updatePreCallNotes(id: string, preCallNotes: string): Promise<Contact> {
  const goalsValue = preCallNotes.trim() || null

  const { data, error } = await supabase
    .from("contacts")
    .update({ pre_call_notes: goalsValue })
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (error) console.error("Save error:", error)

  if (error) throw error
  if (!data) {
    throw new Error(`No contact updated for id ${id}`)
  }

  return mapContactRowToContact(data as ContactRow)
}

export async function updateFollowUpNote(id: string, followupNote: string): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .update({ followup_note: followupNote.trim() || null })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error

  return mapContactRowToContact(data as ContactRow)
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from("contacts").delete().eq("id", id)

  if (error) throw error
}
