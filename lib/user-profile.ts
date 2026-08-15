import { supabase } from "@/lib/supabase/client"

export type UserProfile = {
  id: string
  fullName: string
  currentCompany: string
  role: string
  location: string
  undergraduateUniversity: string
  graduateUniversity: string
  background: string
  linkedinUrl: string
  createdAt: string
}

export type UserProfileRow = {
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

export type UserProfileInput = {
  fullName: string
  currentCompany: string
  role: string
  location: string
  undergraduateUniversity: string
  graduateUniversity: string
  background: string
  linkedinUrl: string
}

export const EMPTY_USER_PROFILE_INPUT: UserProfileInput = {
  fullName: "",
  currentCompany: "",
  role: "",
  location: "",
  undergraduateUniversity: "",
  graduateUniversity: "",
  background: "",
  linkedinUrl: "",
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

function mapInputToRow(input: UserProfileInput) {
  return {
    full_name: input.fullName.trim() || null,
    current_company: input.currentCompany.trim() || null,
    role: input.role.trim() || null,
    location: input.location.trim() || null,
    undergraduate_university: input.undergraduateUniversity.trim() || null,
    graduate_university: input.graduateUniversity.trim() || null,
    background: input.background.trim() || null,
    linkedin_url: input.linkedinUrl.trim() || null,
  }
}

export function userProfileToInput(profile: UserProfile): UserProfileInput {
  return {
    fullName: profile.fullName,
    currentCompany: profile.currentCompany,
    role: profile.role,
    location: profile.location,
    undergraduateUniversity: profile.undergraduateUniversity,
    graduateUniversity: profile.graduateUniversity,
    background: profile.background,
    linkedinUrl: profile.linkedinUrl,
  }
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profile")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return mapUserProfileRow(data as UserProfileRow)
}

export async function saveUserProfile(input: UserProfileInput): Promise<UserProfile> {
  const existing = await fetchUserProfile()
  const row = mapInputToRow(input)

  if (existing) {
    const { data, error } = await supabase
      .from("user_profile")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single()

    if (error) throw error
    return mapUserProfileRow(data as UserProfileRow)
  }

  const { data, error } = await supabase
    .from("user_profile")
    .insert(row)
    .select("*")
    .single()

  if (error) throw error
  return mapUserProfileRow(data as UserProfileRow)
}
