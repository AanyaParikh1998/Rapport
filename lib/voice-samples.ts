import { supabase } from "@/lib/supabase/client"

export type VoiceSampleType = "email" | "linkedin_note" | "linkedin_message"

export type VoiceSample = {
  id: string
  type: VoiceSampleType
  profileId: string | null
  label: string
  body: string
  createdAt: string
}

export type VoiceSampleRow = {
  id: string
  type: string | null
  profile_id: string | null
  label: string
  email_body: string
  created_at: string
}

export type VoiceSampleInput = {
  type: VoiceSampleType
  profileId: string | null
  label: string
  body: string
}

export const LINKEDIN_NOTE_LIMIT = 200
export const LINKEDIN_MESSAGE_LIMIT = 1900

/** @deprecated Use LINKEDIN_NOTE_LIMIT */
export const LINKEDIN_CONNECTION_REQUEST_LIMIT = LINKEDIN_NOTE_LIMIT

function normalizeSampleType(type: string | null | undefined): VoiceSampleType {
  if (type === "linkedin_note") return "linkedin_note"
  if (type === "linkedin_message" || type === "linkedin") return "linkedin_message"
  return "email"
}

export function isLinkedInSampleType(type: VoiceSampleType): boolean {
  return type === "linkedin_note" || type === "linkedin_message"
}

export function getCharacterLimitForSampleType(type: VoiceSampleType): number | null {
  if (type === "linkedin_note") return LINKEDIN_NOTE_LIMIT
  if (type === "linkedin_message") return LINKEDIN_MESSAGE_LIMIT
  return null
}

function mapVoiceSampleRow(row: VoiceSampleRow): VoiceSample {
  return {
    id: row.id,
    type: normalizeSampleType(row.type),
    profileId: row.profile_id ?? null,
    label: row.label,
    body: row.email_body,
    createdAt: row.created_at,
  }
}

export function previewSampleBody(body: string, maxLength = 100): string {
  const collapsed = body.replace(/\s+/g, " ").trim()
  if (collapsed.length <= maxLength) return collapsed
  return `${collapsed.slice(0, maxLength)}...`
}

/** @deprecated Use previewSampleBody */
export const previewEmailBody = previewSampleBody

export async function fetchVoiceSamples(): Promise<VoiceSample[]> {
  const { data, error } = await supabase
    .from("voice_samples")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data as VoiceSampleRow[]).map(mapVoiceSampleRow)
}

export async function createVoiceSample(input: VoiceSampleInput): Promise<VoiceSample> {
  const { data, error } = await supabase
    .from("voice_samples")
    .insert({
      type: input.type,
      profile_id: input.profileId,
      label: input.label.trim(),
      email_body: input.body.trim(),
    })
    .select("*")
    .single()

  if (error) throw error

  return mapVoiceSampleRow(data as VoiceSampleRow)
}

export async function updateVoiceSample(
  id: string,
  input: VoiceSampleInput,
): Promise<VoiceSample> {
  const { data, error } = await supabase
    .from("voice_samples")
    .update({
      type: input.type,
      profile_id: input.profileId,
      label: input.label.trim(),
      email_body: input.body.trim(),
    })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error

  return mapVoiceSampleRow(data as VoiceSampleRow)
}

export async function deleteVoiceSample(id: string): Promise<void> {
  const { error } = await supabase.from("voice_samples").delete().eq("id", id)

  if (error) throw error
}
