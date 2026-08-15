import { NextResponse } from "next/server"
import { createGoogleOAuthClient } from "@/lib/google-calendar"
import { getUserIntegration, saveUserIntegration } from "@/lib/user-integrations"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    return NextResponse.redirect(new URL("/preferences?calendar=error", request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/preferences?calendar=missing_code", request.url))
  }

  try {
    const oauth2Client = createGoogleOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)
    const existing = await getUserIntegration("google_calendar")

    await saveUserIntegration({
      type: "google_calendar",
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? existing?.refresh_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    })

    return NextResponse.redirect(new URL("/preferences?calendar=connected", request.url))
  } catch (callbackError) {
    console.error("[calendar/callback] Failed to save Google Calendar tokens:", callbackError)
    return NextResponse.redirect(new URL("/preferences?calendar=error", request.url))
  }
}
