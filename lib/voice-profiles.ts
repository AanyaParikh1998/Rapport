import { supabase } from "@/lib/supabase/client"

export type VoiceProfile = {
  id: string
  name: string
  description: string | null
  styleInstructions: string | null
  createdAt: string
}

export type VoiceProfileRow = {
  id: string
  name: string
  description: string | null
  style_instructions: string | null
  created_at: string
}

export type VoiceProfileInput = {
  name: string
  description: string | null
  styleInstructions: string | null
}

function mapVoiceProfileRow(row: VoiceProfileRow): VoiceProfile {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    styleInstructions: row.style_instructions ?? null,
    createdAt: row.created_at,
  }
}

export async function fetchVoiceProfiles(): Promise<VoiceProfile[]> {
  const { data, error } = await supabase
    .from("voice_profiles")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) throw error

  return (data as VoiceProfileRow[]).map(mapVoiceProfileRow)
}

export async function createVoiceProfile(input: VoiceProfileInput): Promise<VoiceProfile> {
  const { data, error } = await supabase
    .from("voice_profiles")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      style_instructions: input.styleInstructions?.trim() || null,
    })
    .select("*")
    .single()

  if (error) throw error

  return mapVoiceProfileRow(data as VoiceProfileRow)
}

export async function updateVoiceProfile(
  id: string,
  input: VoiceProfileInput,
): Promise<VoiceProfile> {
  const { data, error } = await supabase
    .from("voice_profiles")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      style_instructions: input.styleInstructions?.trim() || null,
    })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error

  return mapVoiceProfileRow(data as VoiceProfileRow)
}

export async function deleteVoiceProfile(id: string): Promise<void> {
  const { error: unassignError } = await supabase
    .from("voice_samples")
    .update({ profile_id: null })
    .eq("profile_id", id)

  if (unassignError) throw unassignError

  const { error } = await supabase.from("voice_profiles").delete().eq("id", id)

  if (error) throw error
}

export function formatProfileSampleCounts(
  emailCount: number,
  noteCount: number,
  messageCount: number,
): string {
  const parts: string[] = []

  if (emailCount > 0) {
    parts.push(`${emailCount} email${emailCount === 1 ? "" : "s"}`)
  }

  if (noteCount > 0) {
    parts.push(`${noteCount} note${noteCount === 1 ? "" : "s"}`)
  }

  if (messageCount > 0) {
    parts.push(`${messageCount} LinkedIn message${messageCount === 1 ? "" : "s"}`)
  }

  if (parts.length === 0) return "No samples assigned"

  return parts.join(", ")
}

export function previewStyleInstructions(text: string, maxLength = 100): string {
  const collapsed = text.replace(/\s+/g, " ").trim()
  if (collapsed.length <= maxLength) return collapsed
  return `${collapsed.slice(0, maxLength)}...`
}
