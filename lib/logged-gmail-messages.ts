import { supabase } from "@/lib/supabase/client"

export type GmailMessageDirection = "sent" | "received"

export type LoggedGmailMessage = {
  id: string
  messageId: string
  contactId: string
  direction: GmailMessageDirection
  subject: string | null
  dismissed: boolean
  createdAt: string
}

type LoggedGmailMessageRow = {
  id: string
  message_id: string
  contact_id: string
  direction: GmailMessageDirection
  subject: string | null
  dismissed: boolean
  created_at: string
}

function normalizeGmailSubject(subject?: string | null): string | null {
  const trimmed = subject?.trim() ?? ""
  if (!trimmed || trimmed === "(No subject)") return null
  return trimmed
}

function mapLoggedGmailMessageRow(row: LoggedGmailMessageRow): LoggedGmailMessage {
  return {
    id: row.id,
    messageId: row.message_id,
    contactId: row.contact_id,
    direction: row.direction,
    subject: row.subject,
    dismissed: row.dismissed,
    createdAt: row.created_at,
  }
}

function throwSupabaseError(context: string, error: { message?: string } & Record<string, unknown>): never {
  const message = error.message ?? "Unknown Supabase error"
  throw new Error(`${context}: ${message} ${JSON.stringify(error)}`)
}

export async function fetchLoggedGmailMessageIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from("logged_gmail_messages").select("message_id")

  if (error) {
    console.error("[logged-gmail-messages] fetch failed", error)
    throwSupabaseError("[logged-gmail-messages] fetch failed", error)
  }

  return new Set((data ?? []).map((row) => row.message_id as string))
}

export async function isGmailMessageAlreadyConfirmed(
  messageId: string,
  contactId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("logged_gmail_messages")
    .select("id, dismissed")
    .eq("message_id", messageId)
    .eq("contact_id", contactId)
    .maybeSingle()

  if (error) {
    throwSupabaseError("[logged-gmail-messages] confirmed lookup failed", error)
  }

  return Boolean(data && data.dismissed === false)
}

export async function upsertLoggedGmailMessage(input: {
  messageId: string
  contactId: string
  direction: GmailMessageDirection
  subject?: string | null
  dismissed: boolean
}): Promise<LoggedGmailMessage> {
  const subject = normalizeGmailSubject(input.subject)
  const insertPayload = {
    message_id: input.messageId,
    contact_id: input.contactId,
    direction: input.direction,
    subject,
    dismissed: input.dismissed,
  }

  const { data: existing, error: existingError } = await supabase
    .from("logged_gmail_messages")
    .select("*")
    .eq("message_id", input.messageId)
    .eq("contact_id", input.contactId)
    .maybeSingle()

  if (existingError) {
    console.error("[logged-gmail-messages] existing lookup failed", {
      insertPayload,
      error: existingError,
    })
    throwSupabaseError("[logged-gmail-messages] existing lookup failed", existingError)
  }

  if (existing) {
    const { data, error } = await supabase
      .from("logged_gmail_messages")
      .update({ dismissed: input.dismissed, subject })
      .eq("id", existing.id)
      .select("*")
      .single()

    console.log("[logged-gmail-messages] update result:", { data, error })

    if (error) throwSupabaseError("[logged-gmail-messages] update failed", error)
    return mapLoggedGmailMessageRow(data as LoggedGmailMessageRow)
  }

  const { data, error } = await supabase
    .from("logged_gmail_messages")
    .insert(insertPayload)
    .select("*")
    .single()

  console.log("[logged-gmail-messages] insert result:", { data, error, insertPayload })

  if (error) {
    if (error.code === "23505") {
      const { data: duplicate, error: duplicateError } = await supabase
        .from("logged_gmail_messages")
        .select("*")
        .eq("message_id", input.messageId)
        .eq("contact_id", input.contactId)
        .single()

      if (duplicateError) {
        throwSupabaseError("[logged-gmail-messages] duplicate fetch failed", duplicateError)
      }
      return mapLoggedGmailMessageRow(duplicate as LoggedGmailMessageRow)
    }

    throwSupabaseError("[logged-gmail-messages] insert failed", error)
  }

  return mapLoggedGmailMessageRow(data as LoggedGmailMessageRow)
}

export async function dismissGmailMessageMatch(
  messageId: string,
  contactId: string,
  direction: GmailMessageDirection,
  subject?: string | null,
): Promise<LoggedGmailMessage> {
  return upsertLoggedGmailMessage({
    messageId,
    contactId,
    direction,
    subject,
    dismissed: true,
  })
}

export async function confirmGmailMessageMatch(
  messageId: string,
  contactId: string,
  direction: GmailMessageDirection,
  subject?: string | null,
): Promise<LoggedGmailMessage> {
  console.log("confirmGmailMessageMatch called:", {
    messageId,
    contactId,
    direction,
    subject,
  })

  if (!messageId?.trim()) {
    throw new Error("confirmGmailMessageMatch: messageId is required")
  }

  if (!contactId?.trim()) {
    throw new Error("confirmGmailMessageMatch: contactId is required")
  }

  if (direction !== "sent" && direction !== "received") {
    throw new Error(
      `confirmGmailMessageMatch: direction must be "sent" or "received", got ${String(direction)}`,
    )
  }

  return upsertLoggedGmailMessage({
    messageId: messageId.trim(),
    contactId: contactId.trim(),
    direction,
    subject,
    dismissed: false,
  })
}
