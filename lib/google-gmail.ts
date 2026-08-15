import { google } from "googleapis"
import type { UserIntegrationRow } from "@/lib/user-integrations"
import { getAuthenticatedGoogleClient } from "@/lib/google-calendar"

export type GmailParticipant = {
  name: string
  email: string
}

export type GmailMessage = {
  messageId: string
  subject: string
  from: GmailParticipant
  to: GmailParticipant
  toList: GmailParticipant[]
  date: string
  snippet: string
  direction: "sent" | "received"
}

const SNIPPET_MAX_LENGTH = 200
const MESSAGE_FETCH_LIMIT = 50

function getHeaderValue(
  headers: { name?: string | null; value?: string | null }[] | null | undefined,
  name: string,
): string {
  const header = headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())
  return header?.value?.trim() ?? ""
}

export function parseEmailAddress(raw: string): GmailParticipant {
  const trimmed = raw.trim()
  const angleMatch = trimmed.match(/<([^>]+)>/)

  if (angleMatch) {
    const email = angleMatch[1].trim().toLowerCase()
    const name = trimmed
      .replace(/<[^>]+>/, "")
      .replace(/^"|"$/g, "")
      .trim()
    return { name, email }
  }

  if (trimmed.includes("@")) {
    return { name: "", email: trimmed.toLowerCase() }
  }

  return { name: trimmed, email: "" }
}

export function parseEmailAddressList(raw: string): GmailParticipant[] {
  if (!raw.trim()) return []

  const parts: string[] = []
  let current = ""
  let inQuotes = false

  for (const char of raw) {
    if (char === '"') {
      inQuotes = !inQuotes
      current += char
      continue
    }

    if (char === "," && !inQuotes) {
      if (current.trim()) parts.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  if (current.trim()) parts.push(current.trim())

  return parts.map(parseEmailAddress).filter((participant) => participant.email || participant.name)
}

function parseInternalDate(message: { internalDate?: string | null }): string {
  if (!message.internalDate) return new Date().toISOString()
  const parsed = Number.parseInt(message.internalDate, 10)
  if (Number.isNaN(parsed)) return new Date().toISOString()
  return new Date(parsed).toISOString()
}

async function listMessageIds(
  gmail: ReturnType<typeof google.gmail>,
  query: string,
): Promise<string[]> {
  const response = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: MESSAGE_FETCH_LIMIT,
  })

  return (response.data.messages ?? [])
    .map((message) => message.id)
    .filter((id): id is string => Boolean(id))
}

async function fetchMessageMetadata(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string,
  direction: GmailMessage["direction"],
): Promise<GmailMessage | null> {
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "metadata",
    metadataHeaders: ["From", "To", "Subject", "Date"],
  })

  const headers = response.data.payload?.headers ?? []
  const from = parseEmailAddress(getHeaderValue(headers, "From"))
  const toParticipants = parseEmailAddressList(getHeaderValue(headers, "To"))
  const to = toParticipants[0] ?? { name: "", email: "" }
  const subject = getHeaderValue(headers, "Subject") || "(No subject)"
  const headerDate = getHeaderValue(headers, "Date")
  const date = headerDate ? new Date(headerDate).toISOString() : parseInternalDate(response.data)
  const snippet = (response.data.snippet ?? "").trim().slice(0, SNIPPET_MAX_LENGTH)

  if (!from.email && !to.email) return null

  return {
    messageId,
    subject,
    from,
    to,
    toList: toParticipants,
    date,
    snippet,
    direction,
  }
}

export async function isGmailAuthorized(integration: UserIntegrationRow): Promise<boolean> {
  try {
    const auth = getAuthenticatedGoogleClient(integration)
    const gmail = google.gmail({ version: "v1", auth })
    await gmail.users.getProfile({ userId: "me" })
    return true
  } catch {
    return false
  }
}

export async function fetchRecentGmailMessages(
  integration: UserIntegrationRow,
): Promise<GmailMessage[]> {
  const auth = getAuthenticatedGoogleClient(integration)
  const gmail = google.gmail({ version: "v1", auth })

  const [sentIds, receivedIds] = await Promise.all([
    listMessageIds(gmail, "from:me in:sent newer_than:7d"),
    listMessageIds(gmail, "to:me -from:me newer_than:7d"),
  ])

  const sentMessages = await Promise.all(
    sentIds.map((id) => fetchMessageMetadata(gmail, id, "sent")),
  )
  const receivedMessages = await Promise.all(
    receivedIds.map((id) => fetchMessageMetadata(gmail, id, "received")),
  )

  return [...sentMessages, ...receivedMessages].filter(
    (message): message is GmailMessage => message !== null,
  )
}
