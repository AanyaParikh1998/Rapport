import { NextResponse } from "next/server"
import { getAuthenticatedGoogleClient } from "@/lib/google-calendar"
import { fetchRecentGmailMessages, isGmailAuthorized, type GmailMessage } from "@/lib/google-gmail"
import type { GmailContactInteraction } from "@/lib/gmail-matching"
import { supabaseServer } from "@/lib/supabase/server"
import { saveUserIntegration, type UserIntegrationRow } from "@/lib/user-integrations"

type LoggedGmailMessageRow = {
  message_id: string
}

type InteractionRow = {
  contact_id: string
  notes: string
  created_at: string
}

function buildInteractionsByContactId(
  rows: InteractionRow[],
): Record<string, GmailContactInteraction[]> {
  const interactionsByContactId: Record<string, GmailContactInteraction[]> = {}

  for (const row of rows) {
    const list = interactionsByContactId[row.contact_id] ?? []
    list.push({ notes: row.notes, createdAt: row.created_at })
    interactionsByContactId[row.contact_id] = list
  }

  return interactionsByContactId
}

function emptyGmailPayload() {
  return {
    connected: false,
    gmailAuthorized: false,
    syncedAt: null as string | null,
    messages: [] as GmailMessage[],
    loggedMessageIds: [] as string[],
    interactionsByContactId: {} as Record<string, GmailContactInteraction[]>,
  }
}

export async function GET() {
  const syncedAt = new Date().toISOString()

  try {
    const { data: integrationData, error: integrationError } = await supabaseServer
      .from("user_integrations")
      .select("*")
      .eq("type", "google_calendar")
      .maybeSingle()

    if (integrationError) throw integrationError

    const integration = (integrationData as UserIntegrationRow | null) ?? null

    if (!integration?.refresh_token) {
      return NextResponse.json(emptyGmailPayload())
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

    const gmailAuthorized = await isGmailAuthorized(activeIntegration)

    if (!gmailAuthorized) {
      return NextResponse.json({
        ...emptyGmailPayload(),
        connected: true,
      })
    }

    const [{ data: loggedRows, error: loggedError }, { data: interactionRows, error: interactionsError }] =
      await Promise.all([
        supabaseServer.from("logged_gmail_messages").select("message_id"),
        supabaseServer.from("interactions").select("contact_id, notes, created_at"),
      ])

    if (loggedError) throw loggedError
    if (interactionsError) throw interactionsError

    const loggedMessageIds = ((loggedRows ?? []) as LoggedGmailMessageRow[]).map(
      (row) => row.message_id,
    )
    const interactionsByContactId = buildInteractionsByContactId(
      (interactionRows ?? []) as InteractionRow[],
    )

    const messages = await fetchRecentGmailMessages(activeIntegration)

    return NextResponse.json({
      connected: true,
      gmailAuthorized: true,
      syncedAt,
      messages,
      loggedMessageIds,
      interactionsByContactId,
    })
  } catch (error) {
    console.error("[gmail/messages] route error:", error)
    return NextResponse.json(
      {
        ...emptyGmailPayload(),
        error: error instanceof Error ? error.message : "Failed to fetch Gmail messages",
      },
      { status: 500 },
    )
  }
}
