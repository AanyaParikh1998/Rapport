import type { DraftOutreachContact } from "@/lib/draft-outreach-context"
import { getFirstName } from "@/lib/draft-intro-context"
import { normalizeMatchField } from "@/lib/shared-connections"
import type { UserProfile } from "@/lib/user-profile"
import { supabaseServer } from "@/lib/supabase/server"

type UserProfileRow = {
  id: string
  full_name: string | null
  current_company: string | null
  role: string | null
  location: string | null
  undergraduate_university: string | null
  graduate_university: string | null
  background: string | null
  linkedin_url: string | null
  created_at: string
}

function mapUserProfileRow(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    fullName: row.full_name ?? "",
    currentCompany: row.current_company ?? "",
    role: row.role ?? "",
    location: row.location ?? "",
    undergraduateUniversity: row.undergraduate_university ?? "",
    graduateUniversity: row.graduate_university ?? "",
    background: row.background ?? "",
    linkedinUrl: row.linkedin_url ?? "",
    createdAt: row.created_at,
  }
}

export async function fetchUserProfileServer(): Promise<UserProfile | null> {
  const { data, error } = await supabaseServer
    .from("user_profile")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return mapUserProfileRow(data as UserProfileRow)
}

export function profileHasContent(profile: UserProfile | null): boolean {
  if (!profile) return false

  return Boolean(
    profile.fullName.trim() ||
      profile.currentCompany.trim() ||
      profile.role.trim() ||
      profile.location.trim() ||
      profile.undergraduateUniversity.trim() ||
      profile.graduateUniversity.trim() ||
      profile.background.trim() ||
      profile.linkedinUrl.trim(),
  )
}

export function getDraftSignOff(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim()
  return trimmed ? `Best, ${trimmed}` : "Best"
}

export function getSenderFirstName(profile: UserProfile | null): string | null {
  if (!profile?.fullName.trim()) return null
  const first = getFirstName(profile.fullName)
  return first === "there" ? null : first
}

export function getSenderDisplayName(profile: UserProfile | null): string {
  return profile?.fullName.trim() || "the sender"
}

function getProfileSchools(profile: UserProfile): string[] {
  const schools: string[] = []
  const seen = new Set<string>()

  for (const school of [profile.undergraduateUniversity, profile.graduateUniversity]) {
    const trimmed = school.trim()
    const normalized = normalizeMatchField(trimmed)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    schools.push(trimmed)
  }

  return schools
}

function getContactSchools(contact: DraftOutreachContact): string[] {
  const schools: string[] = []
  const seen = new Set<string>()

  for (const school of [contact.undergraduateUniversity, contact.graduateUniversity]) {
    const trimmed = (school ?? "").trim()
    const normalized = normalizeMatchField(trimmed)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    schools.push(trimmed)
  }

  return schools
}

export function getVerifiedSharedUniversities(
  profile: UserProfile | null,
  contact: DraftOutreachContact,
): string[] {
  if (!profile) return []

  const profileSchools = getProfileSchools(profile)
  const contactSchools = getContactSchools(contact)
  const matches: string[] = []
  const seen = new Set<string>()

  for (const profileSchool of profileSchools) {
    for (const contactSchool of contactSchools) {
      if (normalizeMatchField(profileSchool) !== normalizeMatchField(contactSchool)) continue
      const normalized = normalizeMatchField(profileSchool)
      if (seen.has(normalized)) continue
      seen.add(normalized)
      matches.push(profileSchool)
    }
  }

  return matches
}

export function formatVerifiedUniversityOverlap(
  profile: UserProfile | null,
  contact: DraftOutreachContact,
): string {
  const matches = getVerifiedSharedUniversities(profile, contact)

  if (matches.length === 0) {
    return "None verified. Do not mention attending the same university or any shared school connection with this contact."
  }

  return `Verified shared university with this contact: ${matches.join(", ")}. You may reference this only if relevant and natural.`
}

export function formatSenderForSystemPrompt(profile: UserProfile | null): string {
  if (!profileHasContent(profile)) {
    return [
      "The sender has not completed their profile.",
      "Do not invent personal details about the sender.",
      "Use generic first-person language without claiming specific employers, schools, locations, or background.",
      'Sign off with "Best" only (no name).',
      "Never fabricate shared connections.",
    ].join(" ")
  }

  const lines = ["About the sender (use only these facts; never invent others):"]

  if (profile!.fullName.trim()) lines.push(`- Name: ${profile!.fullName.trim()}`)
  if (profile!.currentCompany.trim()) {
    lines.push(`- Current company or school: ${profile!.currentCompany.trim()}`)
  }
  if (profile!.role.trim()) lines.push(`- Role or program: ${profile!.role.trim()}`)
  if (profile!.location.trim()) lines.push(`- Location: ${profile!.location.trim()}`)
  if (profile!.undergraduateUniversity.trim()) {
    lines.push(`- Undergraduate university: ${profile!.undergraduateUniversity.trim()}`)
  }
  if (profile!.graduateUniversity.trim()) {
    lines.push(`- Graduate university: ${profile!.graduateUniversity.trim()}`)
  }
  if (profile!.background.trim()) {
    lines.push(`- Professional background: ${profile!.background.trim()}`)
  }

  lines.push(
    `Sign off messages to contacts with "${getDraftSignOff(profile!.fullName)}" at the end.`,
  )
  lines.push(
    "Never fabricate shared connections, employers, or schools that are not listed above or in the verified connections section.",
  )

  return lines.join("\n")
}

export function formatSenderForIntroPrompt(profile: UserProfile | null): string {
  if (!profileHasContent(profile)) {
    return "The sender has not completed their profile. Use generic first-person language without inventing personal details."
  }

  const parts: string[] = []

  if (profile!.fullName.trim()) parts.push(`Name: ${profile!.fullName.trim()}`)
  if (profile!.currentCompany.trim()) {
    parts.push(`Current company or school: ${profile!.currentCompany.trim()}`)
  }
  if (profile!.role.trim()) parts.push(`Role or program: ${profile!.role.trim()}`)
  if (profile!.background.trim()) {
    parts.push(`Professional background: ${profile!.background.trim()}`)
  }

  return parts.length > 0 ? parts.join("\n") : "No sender details available."
}
