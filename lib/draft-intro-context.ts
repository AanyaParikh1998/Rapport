import {
  contactToDraftContext,
  normalizeDraftSignOff,
  type DraftOutreachContact,
  type DraftOutreachFormat,
} from "@/lib/draft-outreach-context"
import type { Contact } from "@/lib/data"
import type { UserProfile } from "@/lib/user-profile"
import {
  formatSenderForIntroPrompt,
  getDraftSignOff,
  getSenderDisplayName,
  getSenderFirstName,
} from "@/lib/user-profile-format"

export type IntroDraftFormat = "email" | "linkedin_message"

export type IntroDraftType = "introducer" | "forwardable"

export function contactToIntroContext(contact: Contact): DraftOutreachContact {
  return contactToDraftContext(contact)
}

export function getFirstName(fullName: string): string {
  const trimmed = fullName.trim()
  if (!trimmed) return "there"
  return trimmed.split(/\s+/)[0] ?? trimmed
}

export function formatIntroSharedContext(reason: string): string {
  return reason.replace(/^Both at /, "")
}

export function buildIntroducerDraftPrompt(
  target: DraftOutreachContact,
  introducer: DraftOutreachContact,
  sharedReason: string,
  format: IntroDraftFormat,
  voiceContext: string,
  userProfile: UserProfile | null,
  regeneration?: {
    previousDraft: { subject: string | null; body: string }
    suggestions: string
  } | null,
): string {
  const introducerFirstName = getFirstName(introducer.name)
  const sharedContext = formatIntroSharedContext(sharedReason)
  const senderName = getSenderDisplayName(userProfile)
  const signOff = getDraftSignOff(userProfile?.fullName)

  let regenerationSection = ""
  const trimmedSuggestions = regeneration?.suggestions.trim()
  if (regeneration && trimmedSuggestions) {
    const previousText =
      format === "email" && regeneration.previousDraft.subject
        ? `Subject: ${regeneration.previousDraft.subject.trim()}\n\n${regeneration.previousDraft.body.trim()}`
        : regeneration.previousDraft.body.trim()

    regenerationSection = `Previous draft:
${previousText}

The user wants these specific changes: ${trimmedSuggestions}. Apply them while keeping the same voice.

`
  }

  const formatInstructions =
    format === "email"
      ? "Return JSON with subject (string) and body (string)."
      : "Return JSON with subject set to null and body (string) containing the LinkedIn message only. Keep under 1900 characters."

  return `${regenerationSection}Write a warm intro REQUEST message from ${senderName} to ${introducerFirstName} (${introducer.name}).

This message goes TO the introducer (your mutual connection), NOT to the target contact.

Sender details:
${formatSenderForIntroPrompt(userProfile)}

Requirements:
- Address ${introducerFirstName} by first name
- Explain who ${target.name} is (${target.role} at ${target.company}) and why ${senderName} wants to connect with them
- Ask if ${introducerFirstName} would be comfortable making an introduction
- Reference the shared connection: "I know you both ${sharedReason.startsWith("Both at ") ? `worked at ${sharedContext}` : `went to ${sharedContext}`}" or similar natural phrasing using: ${sharedReason}
- Keep it warm and brief, under 150 words
- Sign off with "${signOff}"
- Never use em dashes
- Never fabricate shared connections beyond what is listed above

Target contact details:
- Name: ${target.name}
- Company: ${target.company}
- Role: ${target.role}
- Goal: ${target.goal}
- Notes: ${target.notes || "None"}

Introducer details:
- Name: ${introducer.name}
- Company: ${introducer.company}
- Role: ${introducer.role}
- Connection type: ${introducer.connectionType}

Writing samples to match:
${voiceContext}

${formatInstructions}

Return ONLY valid JSON with keys: subject, body`
}

export function buildForwardableDraftPrompt(
  target: DraftOutreachContact,
  introducer: DraftOutreachContact,
  sharedReason: string,
  format: IntroDraftFormat,
  voiceContext: string,
  userProfile: UserProfile | null,
  regeneration?: {
    previousDraft: { subject: string | null; body: string }
    suggestions: string
  } | null,
): string {
  const targetFirstName = getFirstName(target.name)
  const senderName = getSenderDisplayName(userProfile)
  const senderFirstName = getSenderFirstName(userProfile) ?? senderName

  let regenerationSection = ""
  const trimmedSuggestions = regeneration?.suggestions.trim()
  if (regeneration && trimmedSuggestions) {
    const previousText =
      format === "email" && regeneration.previousDraft.subject
        ? `Subject: ${regeneration.previousDraft.subject.trim()}\n\n${regeneration.previousDraft.body.trim()}`
        : regeneration.previousDraft.body.trim()

    regenerationSection = `Previous draft:
${previousText}

The user wants these specific changes: ${trimmedSuggestions}. Apply them while keeping the same voice.

`
  }

  const formatInstructions =
    format === "email"
      ? "Return JSON with subject (string) and body (string)."
      : "Return JSON with subject set to null and body (string) containing the LinkedIn message only. Keep under 1900 characters."

  return `${regenerationSection}Write a FORWARDABLE message that ${introducer.name} could send to ${target.name} to introduce ${senderName}.

This is written as if ${introducer.name} is forwarding it to ${targetFirstName}. It is NOT from ${senderName} directly to ${targetFirstName}.

Sender to introduce:
${formatSenderForIntroPrompt(userProfile)}

Requirements:
- Written in third person or as ${introducer.name} introducing ${senderFirstName} (e.g. "I wanted to introduce you to ${senderFirstName}...")
- Introduces ${senderFirstName}, their background, and why they want to connect with ${targetFirstName}
- Be specific to ${target.name}'s role (${target.role}) and company (${target.company})
- Under 100 words
- Should feel natural for ${introducer.name} to forward with minimal editing
- Do NOT sign off as ${senderName}; end naturally as a forwardable note from the introducer
- Never use em dashes
- Shared context between introducer and target: ${sharedReason}
- Never fabricate background details not listed in sender details above

Target contact:
- Name: ${target.name}
- Company: ${target.company}
- Role: ${target.role}
- Goal: ${target.goal}

Writing samples to match (adapt tone but remember this is a forwardable blurb, not direct outreach from the sender):
${voiceContext}

${formatInstructions}

Return ONLY valid JSON with keys: subject, body`
}

export function normalizeIntroducerDraftBody(
  body: string,
  signOffName?: string | null,
): string {
  return normalizeDraftSignOff(body, signOffName)
}

export function normalizeForwardableDraftBody(body: string): string {
  return body.trim()
}

export function formatIntroDraftNote(
  draftType: IntroDraftType,
  targetName: string,
  introducerName: string,
): string {
  if (draftType === "introducer") {
    return `Warm intro request for ${targetName}`
  }
  return `Forwardable intro to ${targetName} (via ${introducerName})`
}

export function prependIntroDraftNote(note: string, body: string): string {
  return `[${note}]\n\n${body.trim()}`
}

export function introFormatToOutreachFormat(format: IntroDraftFormat): DraftOutreachFormat {
  return format === "linkedin_message" ? "linkedin_message" : "email"
}
