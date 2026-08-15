import type { Contact } from "@/lib/data"
import {
  findSharedConnections,
  groupSharedConnections,
  getSharedConnectionSuffix,
} from "@/lib/shared-connections"
import { LINKEDIN_MESSAGE_LIMIT, LINKEDIN_NOTE_LIMIT } from "@/lib/voice-samples"

export type DraftOutreachContact = {
  id: string
  name: string
  company: string
  role: string
  city?: string
  undergraduateUniversity?: string
  graduateUniversity?: string
  goal: string
  connectionType: string
  source: string
  mutualCount?: number | null
  notes: string
}

export type DraftOutreachFormat = "email" | "linkedin_note" | "linkedin_message"

export function contactToDraftContext(contact: Contact): DraftOutreachContact {
  return {
    id: contact.id,
    name: contact.name,
    company: contact.company,
    role: contact.role,
    city: contact.city,
    undergraduateUniversity: contact.undergraduateUniversity,
    graduateUniversity: contact.graduateUniversity,
    goal: contact.goal,
    connectionType: contact.connectionType,
    source: contact.source,
    mutualCount: contact.mutualCount,
    notes: contact.notes,
  }
}

function formatPeopleList(names: string[]): string {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`
}

export function formatSharedConnectionsForPrompt(
  contact: Contact,
  contacts: Contact[],
): string {
  const groups = groupSharedConnections(findSharedConnections(contact, contacts))

  if (groups.length === 0) return "None"

  return groups
    .map((group) => {
      const names = formatPeopleList(group.people.map((person) => person.contactName))
      return `- ${names}${getSharedConnectionSuffix(group)}`
    })
    .join("\n")
}

export function getGoalInstructions(goal: string): string {
  switch (goal) {
    case "Informational call":
      return "Ask for 20 minutes to learn about their work. Reference specific context about them."
    case "Referral":
      return "Ask if they know anyone at a specific type of company or role relevant to the contact."
    case "Mentorship":
      return "Ask for ongoing advice and reference their specific experience."
    default:
      return "Write a thoughtful outreach message aligned with the stated goal."
  }
}

export function getCharacterLimitForFormat(format: DraftOutreachFormat): number | null {
  if (format === "linkedin_note") return LINKEDIN_NOTE_LIMIT
  if (format === "linkedin_message") return LINKEDIN_MESSAGE_LIMIT
  return null
}

export function formatDraftOutreachLabel(format: DraftOutreachFormat): string {
  switch (format) {
    case "linkedin_note":
      return "LinkedIn note"
    case "linkedin_message":
      return "LinkedIn message"
    default:
      return "Email"
  }
}

export function isLinkedInDraftFormat(format: DraftOutreachFormat): boolean {
  return format === "linkedin_note" || format === "linkedin_message"
}

const SIGN_OFF_PLACEHOLDER_PATTERN =
  /Best,\s*(?:Your Name|\[Your Name\]|\[Name\]|\[[^\]]+\]|<[^>]+>|{[^}]+})/gi

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function hasCorrectSignOff(text: string, signOff: string): boolean {
  const pattern = new RegExp(`${escapeRegExp(signOff)}\\s*$`, "i")
  return pattern.test(text.trim())
}

export function normalizeDraftSignOff(body: string, signOffName?: string | null): string {
  const trimmedName = signOffName?.trim()
  const signOff = trimmedName ? `Best, ${trimmedName}` : "Best"

  let text = body.trim()
  if (!text) return signOff

  text = text.replace(SIGN_OFF_PLACEHOLDER_PATTERN, signOff)

  if (hasCorrectSignOff(text, signOff)) {
    return text.trim()
  }

  text = text.replace(/\n*Best,\s[^\n]*\s*$/i, "").trim()

  return text ? `${text}\n\n${signOff}` : signOff
}
