import { supabaseServer } from "@/lib/supabase/server"

export type IntegrationType = "google_calendar"

export type UserIntegrationRow = {
  id: string
  created_at: string
  type: IntegrationType
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
}

export async function getUserIntegration(
  type: IntegrationType,
): Promise<UserIntegrationRow | null> {
  const { data, error } = await supabaseServer
    .from("user_integrations")
    .select("*")
    .eq("type", type)
    .maybeSingle()

  if (error) throw error
  return (data as UserIntegrationRow | null) ?? null
}

export async function saveUserIntegration(input: {
  type: IntegrationType
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null
}): Promise<UserIntegrationRow> {
  const existing = await getUserIntegration(input.type)

  const row = {
    type: input.type,
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
    expires_at: input.expiresAt,
  }

  if (existing) {
    const { data, error } = await supabaseServer
      .from("user_integrations")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single()

    if (error) throw error
    return data as UserIntegrationRow
  }

  const { data, error } = await supabaseServer
    .from("user_integrations")
    .insert(row)
    .select("*")
    .single()

  if (error) throw error
  return data as UserIntegrationRow
}

export async function deleteUserIntegration(type: IntegrationType): Promise<void> {
  const { error } = await supabaseServer.from("user_integrations").delete().eq("type", type)

  if (error) throw error
}

export async function isGoogleCalendarConnected(): Promise<boolean> {
  const integration = await getUserIntegration("google_calendar")
  return Boolean(integration?.refresh_token)
}
