import type { Contact, Stage } from "@/lib/data"
import { AUTO_LOG_THEY_RESPONDED } from "@/lib/interactions"
import type { GmailMessage } from "@/lib/google-gmail"

// Gmail matching is independent of track_calendar. The calendar toggle only
// suppresses Google Calendar banners; email detection always runs for all contacts.

export type GmailMatchActionType =
  | "sent_move_in_progress"
  | "sent_log_follow_up"
  | "received_move_responded"
  | "received_log"

export type GmailContactInteraction = {
  notes: string
  createdAt: string
}

export type GmailMatchingContext = {
  interactionsByContactId: Map<string, GmailContactInteraction[]>
}

export type GmailMessageMatch = {
  message: GmailMessage
  contact: Contact
  action: GmailMatchActionType
}

const RE_ENGAGEMENT_DAYS = 30
const MS_PER_DAY = 86_400_000

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? ""
}

function parseContactNameParts(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "", lastName: "" }
  if (parts.length === 1) return { firstName: parts[0], lastName: "" }
  return { firstName: parts[0], lastName: parts[parts.length - 1] }
}

function nameMatchesContact(displayName: string, contact: Contact): boolean {
  const normalizedDisplay = displayName.trim().toLowerCase()
  if (!normalizedDisplay) return false

  const contactName = contact.name.trim().toLowerCase()
  if (!contactName) return false

  if (
    normalizedDisplay === contactName ||
    normalizedDisplay.includes(contactName) ||
    contactName.includes(normalizedDisplay)
  ) {
    return true
  }

  const { firstName, lastName } = parseContactNameParts(contact.name)
  const first = firstName.toLowerCase()
  const last = lastName.toLowerCase()

  if (first.length >= 3 && normalizedDisplay.includes(first)) return true
  if (last.length >= 3 && normalizedDisplay.includes(last)) return true

  return false
}

function contactMatchesParticipant(contact: Contact, participant: { name: string; email: string }): boolean {
  const participantEmail = normalizeEmail(participant.email)
  const contactEmail = normalizeEmail(contact.email)

  if (contactEmail && participantEmail && contactEmail === participantEmail) {
    return true
  }

  if (contactEmail) return false

  return nameMatchesContact(participant.name, contact)
}

function hasEmailSentInteraction(interactions: GmailContactInteraction[]): boolean {
  return interactions.some((interaction) => {
    const notes = interaction.notes.trim()
    return notes === "Email sent" || notes.startsWith("Email sent:")
  })
}

function hasTheyRespondedOrEmailReceived(interactions: GmailContactInteraction[]): boolean {
  return interactions.some((interaction) => {
    const notes = interaction.notes.trim()
    return (
      notes === AUTO_LOG_THEY_RESPONDED ||
      notes === "They responded" ||
      notes === "Email received" ||
      notes.startsWith("Email received:")
    )
  })
}

function getLastInteractionMs(interactions: GmailContactInteraction[]): number | null {
  if (interactions.length === 0) return null

  const timestamps = interactions
    .map((interaction) => new Date(interaction.createdAt).getTime())
    .filter((value) => !Number.isNaN(value))

  if (timestamps.length === 0) return null
  return Math.max(...timestamps)
}

function isReEngagementEligible(
  interactions: GmailContactInteraction[],
  nowMs = Date.now(),
): boolean {
  const lastMs = getLastInteractionMs(interactions)
  if (lastMs === null) return false
  return (nowMs - lastMs) / MS_PER_DAY > RE_ENGAGEMENT_DAYS
}

export function shouldSurfaceGmailBanner(
  contact: Contact,
  message: GmailMessage,
  interactions: GmailContactInteraction[],
): boolean {
  if (message.direction === "sent") {
    if (contact.stage === "not_contacted" && !hasEmailSentInteraction(interactions)) {
      return true
    }

    if (isReEngagementEligible(interactions)) {
      return true
    }

    return false
  }

  if (contact.stage === "in_progress" && !hasTheyRespondedOrEmailReceived(interactions)) {
    return true
  }

  if (isReEngagementEligible(interactions)) {
    return true
  }

  return false
}

export function getGmailMatchAction(
  contact: Contact,
  message: GmailMessage,
  interactions: GmailContactInteraction[],
): GmailMatchActionType | null {
  if (!shouldSurfaceGmailBanner(contact, message, interactions)) {
    return null
  }

  if (message.direction === "sent") {
    if (contact.stage === "not_contacted") {
      return "sent_move_in_progress"
    }

    return "sent_log_follow_up"
  }

  if (contact.stage === "in_progress") {
    return "received_move_responded"
  }

  return "received_log"
}

function getParticipantsToMatch(message: GmailMessage): { name: string; email: string }[] {
  if (message.direction === "sent") {
    return message.toList.length > 0 ? message.toList : [message.to]
  }

  return [message.from]
}

export function buildGmailInteractionsByContactId(
  record: Record<string, GmailContactInteraction[]> | null | undefined,
): Map<string, GmailContactInteraction[]> {
  const interactionsByContactId = new Map<string, GmailContactInteraction[]>()

  if (!record) return interactionsByContactId

  for (const [contactId, interactions] of Object.entries(record)) {
    if (Array.isArray(interactions)) {
      interactionsByContactId.set(contactId, interactions)
    }
  }

  return interactionsByContactId
}

export function matchGmailMessagesToContacts(
  messages: GmailMessage[],
  contacts: Contact[],
  loggedMessageIds: Set<string>,
  context: GmailMatchingContext,
): GmailMessageMatch[] {
  const matches: GmailMessageMatch[] = []
  const usedMessageIds = new Set<string>()

  for (const message of messages) {
    if (loggedMessageIds.has(message.messageId)) continue
    if (usedMessageIds.has(message.messageId)) continue

    const participants = getParticipantsToMatch(message)

    for (const contact of contacts) {
      const participantMatched = participants.some((participant) =>
        contactMatchesParticipant(contact, participant),
      )

      if (!participantMatched) continue

      const interactions = context.interactionsByContactId.get(contact.id) ?? []
      const action = getGmailMatchAction(contact, message, interactions)
      if (!action) continue

      matches.push({ message, contact, action })
      usedMessageIds.add(message.messageId)
      break
    }
  }

  return matches.sort(
    (left, right) => new Date(right.message.date).getTime() - new Date(left.message.date).getTime(),
  )
}

export type ComputeGmailMatchesOptions = {
  loggedMessageIds: Set<string>
  interactionsByContactId: Map<string, GmailContactInteraction[]>
  connected: boolean
  authorized: boolean
}

export function computeGmailMatches(
  contacts: Contact[],
  messages: GmailMessage[],
  dismissedKeys: Set<string>,
  options: ComputeGmailMatchesOptions,
): GmailMessageMatch[] {
  if (
    !options.connected ||
    !options.authorized ||
    contacts.length === 0 ||
    messages.length === 0
  ) {
    return []
  }

  const matches = matchGmailMessagesToContacts(
    messages,
    contacts,
    options.loggedMessageIds,
    { interactionsByContactId: options.interactionsByContactId },
  )

  return matches.filter((match) => !dismissedKeys.has(getGmailMatchKey(match)))
}

export function formatGmailMatchBannerText(match: GmailMessageMatch): string {
  const dateLabel = formatGmailDateLabel(match.message.date)
  const name = match.contact.name

  switch (match.action) {
    case "sent_move_in_progress":
      return `${name} · You emailed them on ${dateLabel} · Move to In progress?`
    case "sent_log_follow_up":
      return `${name} · You emailed them on ${dateLabel} · Log as follow-up sent?`
    case "received_move_responded":
      return `${name} replied to your email on ${dateLabel} · Move to Responded?`
    case "received_log":
      return `${name} emailed you on ${dateLabel} · Log this?`
  }
}

export function getGmailConfirmButtonLabel(action: GmailMatchActionType): string {
  switch (action) {
    case "sent_move_in_progress":
      return "Yes, move them"
    case "sent_log_follow_up":
    case "received_log":
      return "Yes, log it"
    case "received_move_responded":
      return "Move to Responded"
  }
}

function normalizeGmailSubject(subject?: string): string {
  const trimmed = subject?.trim() ?? ""
  if (!trimmed || trimmed === "(No subject)") return ""
  return trimmed
}

export function formatGmailInteractionNote(
  action: GmailMatchActionType,
  subject?: string,
): string | null {
  const trimmedSubject = normalizeGmailSubject(subject)

  switch (action) {
    case "sent_move_in_progress":
    case "sent_log_follow_up":
      return trimmedSubject ? `Email sent: ${trimmedSubject}` : "Email sent"
    case "received_log":
      return trimmedSubject ? `Email received: ${trimmedSubject}` : "Email received"
    case "received_move_responded":
      return null
  }
}

/** @deprecated Use formatGmailInteractionNote(action, subject) instead */
export function getGmailInteractionNote(action: GmailMatchActionType): string | null {
  return formatGmailInteractionNote(action)
}

export function getGmailMatchKey(match: GmailMessageMatch): string {
  return `${match.contact.id}:${match.message.messageId}`
}

function formatGmailDateLabel(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return "recently"

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function shouldMoveContactOnGmailConfirm(
  action: GmailMatchActionType,
): action is "received_move_responded" | "sent_move_in_progress" {
  return action === "received_move_responded" || action === "sent_move_in_progress"
}

export function getGmailTargetStage(action: GmailMatchActionType): Stage | null {
  if (action === "received_move_responded") return "responded"
  if (action === "sent_move_in_progress") return "in_progress"
  return null
}

export function logsGmailEmailOnConfirm(action: GmailMatchActionType): boolean {
  return (
    action === "sent_move_in_progress" ||
    action === "sent_log_follow_up" ||
    action === "received_move_responded" ||
    action === "received_log"
  )
}
