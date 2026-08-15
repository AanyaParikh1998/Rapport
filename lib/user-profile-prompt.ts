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
