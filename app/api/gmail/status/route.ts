import { NextResponse } from "next/server"
import { getAuthenticatedGoogleClient } from "@/lib/google-calendar"
import { isGmailAuthorized } from "@/lib/google-gmail"
import { supabaseServer } from "@/lib/supabase/server"
import { saveUserIntegration, type UserIntegrationRow } from "@/lib/user-integrations"

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("user_integrations")
      .select("*")
      .eq("type", "google_calendar")
      .maybeSingle()

    if (error) throw error

    const integration = (data as UserIntegrationRow | null) ?? null

    if (!integration?.refresh_token) {
      return NextResponse.json({ connected: false })
    }

    const auth = getAuthenticatedGoogleClient(integration)
    await auth.getAccessToken()
    const credentials = auth.credentials

    const activeIntegration =
      credentials.access_token &&
      (credentials.access_token !== integration.access_token ||
        credentials.expiry_date !==
          (integration.expires_at ? new Date(integration.expires_at).getTime() : undefined))
        ? await saveUserIntegration({
            type: "google_calendar",
            accessToken: credentials.access_token ?? null,
            refreshToken: credentials.refresh_token ?? integration.refresh_token,
            expiresAt: credentials.expiry_date
              ? new Date(credentials.expiry_date).toISOString()
              : integration.expires_at,
          })
        : integration

    const connected = await isGmailAuthorized(activeIntegration)

    return NextResponse.json({ connected })
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Failed to check Gmail status",
      },
      { status: 500 },
    )
  }
}
