import { NextResponse } from "next/server"
import {
  type DraftOutreachContact,
  type DraftOutreachFormat,
  formatSharedConnectionsForPrompt,
  getCharacterLimitForFormat,
  getGoalInstructions,
  isLinkedInDraftFormat,
  normalizeDraftSignOff,
} from "@/lib/draft-outreach-context"
import type { Contact } from "@/lib/data"
import {
  formatSummaryBulletsForPrompt,
  parseNullableSummaryBulletField,
  parseSummaryBulletField,
  type PostCallSummary,
} from "@/lib/post-call-context"
import { supabaseServer } from "@/lib/supabase/server"
import {
  fetchUserProfileServer,
  formatSenderForSystemPrompt,
  formatVerifiedUniversityOverlap,
} from "@/lib/user-profile-prompt"
import type { UserProfile } from "@/lib/user-profile"

type VoiceSampleRow = {
  label: string
  email_body: string
}

type SuccessfulDraftRow = {
  subject: string | null
  body: string
}

const LINKEDIN_NOTE_SYSTEM_PROMPT =
  "This is a LinkedIn connection request note. It must be under 200 characters. Be specific about why you want to connect. No generic phrases. Get straight to the point."

const LINKEDIN_MESSAGE_SYSTEM_PROMPT =
  "This is a LinkedIn message to an existing connection. Keep it under 1900 characters."

function buildSystemPrompt(
  styleInstructions: string | null,
  format: DraftOutreachFormat,
  userProfile: UserProfile | null,
): string {
  const base =
    "You are a personal outreach assistant. Write in the exact style of the sample messages provided. Match the tone, length, sentence structure, and level of formality precisely. Never use generic corporate language. Never use em dashes in any output. Use commas or periods instead. Never use placeholder text like 'Your Name' or '[Name]'. Never fabricate shared connections that are not explicitly verified below."

  const parts = [base, formatSenderForSystemPrompt(userProfile)]

  const trimmed = styleInstructions?.trim()
  if (trimmed) {
    parts.push(`The user has provided these additional style rules. Follow them strictly: ${trimmed}`)
  }

  if (format === "linkedin_note") {
    parts.push(LINKEDIN_NOTE_SYSTEM_PROMPT)
  } else if (format === "linkedin_message") {
    parts.push(LINKEDIN_MESSAGE_SYSTEM_PROMPT)
  }

  return parts.join("\n\n")
}

type DraftResponse = {
  subject: string | null
  body: string
}

function extractJsonObject(text: string): DraftResponse {
  const trimmed = text.trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not parse draft response")
  }

  const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<DraftResponse>

  return {
    subject: typeof parsed.subject === "string" ? parsed.subject : null,
    body: typeof parsed.body === "string" ? parsed.body : "",
  }
}

function formatSampleList(samples: VoiceSampleRow[]): string {
  return samples
    .map(
      (sample, index) =>
        `Sample ${index + 1} (${sample.label}):\n${sample.email_body.trim()}`,
    )
    .join("\n\n")
}

function formatSuccessfulDraftList(drafts: SuccessfulDraftRow[], format: DraftOutreachFormat): string {
  return drafts
    .map((draft, index) => {
      if (format === "email" && draft.subject) {
        return `Message ${index + 1}:\nSubject: ${draft.subject.trim()}\n\n${draft.body.trim()}`
      }
      return `Message ${index + 1}:\n${draft.body.trim()}`
    })
    .join("\n\n")
}

function formatVoiceContext(
  successfulDrafts: SuccessfulDraftRow[],
  voiceSamples: VoiceSampleRow[],
  format: DraftOutreachFormat,
): string {
  const sections: string[] = []

  if (successfulDrafts.length > 0) {
    sections.push(
      `These messages received a response:\n${formatSuccessfulDraftList(successfulDrafts, format)}`,
    )
  }

  if (voiceSamples.length > 0) {
    sections.push(`Additional style samples:\n${formatSampleList(voiceSamples)}`)
  }

  if (sections.length === 0) {
    return "No writing samples provided. Use a warm, concise, personal tone."
  }

  return sections.join("\n\n")
}

function formatFollowUpContext(
  sentDraft: { subject: string | null; body: string; sentAt: string },
  format: DraftOutreachFormat,
): string {
  const sentDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(sentDraft.sentAt))

  const previousMessage =
    format === "email" && sentDraft.subject
      ? `Subject: ${sentDraft.subject.trim()}\n${sentDraft.body.trim()}`
      : sentDraft.body.trim()

  return `This is a follow-up message. The previous message sent to this contact was:

${previousMessage}

Sent on: ${sentDate}

Write a follow-up that references the previous outreach naturally without being repetitive. Acknowledge that you reached out before and give them a new reason to respond.

`
}

function formatInteractionSummaryContext(summary: {
  summary_discussed: string
  summary_commitments: string | null
  summary_followups: string | null
}): string {
  const lines = [`What was discussed: ${summary.summary_discussed.trim()}`]

  if (summary.summary_commitments?.trim()) {
    lines.push(`Commitments: ${summary.summary_commitments.trim()}`)
  }

  if (summary.summary_followups?.trim()) {
    lines.push(`Follow-ups: ${summary.summary_followups.trim()}`)
  }

  return `Context from last interaction with this contact:
${lines.join("\n")}

Use this context to make the follow-up message feel personal and reference the actual conversation.

`
}

function formatRecentInteractionContext(summary: {
  summary_discussed: string
  summary_commitments: string | null
  summary_followups: string | null
}): string {
  return `Context from most recent interaction:
What was discussed: ${summary.summary_discussed.trim()}
Commitments: ${summary.summary_commitments?.trim() || "None"}
Follow-ups: ${summary.summary_followups?.trim() || "None"}

This is a follow-up message. Reference the previous conversation naturally. Do not reintroduce yourself. Pick up where the conversation left off and address any commitments or follow-ups from the notes above.

`
}

function formatPriorContactFollowUpContext(): string {
  return `This is a follow-up message. You have been in touch with this contact before. Do not reintroduce yourself. Write a natural follow-up that picks up the relationship and gives them a reason to respond.

`
}

function formatPostCallDraftContext(context: {
  preCallNotes: string
  callSummary: PostCallSummary
}): string {
  return `Pre-call goals: ${context.preCallNotes.trim() || "None specified"}

What was discussed in the call:
${formatSummaryBulletsForPrompt(context.callSummary.discussed)}
Commitments made:
${formatSummaryBulletsForPrompt(context.callSummary.commitments)}
Next steps:
${formatSummaryBulletsForPrompt(context.callSummary.next_steps)}

Write a follow-up that references the actual conversation, picks up on the next steps, and addresses any open commitments. Do not reintroduce. Write as if continuing an existing relationship.

`
}

function buildUserPrompt(
  contact: DraftOutreachContact,
  sharedConnections: string,
  verifiedUniversityOverlap: string,
  format: DraftOutreachFormat,
  successfulDrafts: SuccessfulDraftRow[],
  voiceSamples: VoiceSampleRow[],
  regeneration?: {
    previousDraft: { subject: string | null; body: string }
    suggestions: string
  } | null,
  followUp?: { subject: string | null; body: string; sentAt: string } | null,
  interactionContextSection?: string,
): string {
  const universities = [contact.undergraduateUniversity, contact.graduateUniversity]
    .filter(Boolean)
    .join("; ")

  const goalInstructions = getGoalInstructions(contact.goal)
  const characterLimit = getCharacterLimitForFormat(format)

  const formatInstructions =
    format === "email"
      ? "Generate a subject line and email body. Return JSON with subject (string) and body (string)."
      : format === "linkedin_note"
        ? `Generate a LinkedIn connection request note. Keep the body under ${characterLimit} characters. Return JSON with subject set to null and body (string) containing the note only.`
        : `Generate a LinkedIn message to an existing connection. Keep the body under ${characterLimit} characters. Return JSON with subject set to null and body (string) containing the message only.`

  const formatLabel =
    format === "linkedin_note"
      ? "LinkedIn connection request note"
      : format === "linkedin_message"
        ? "LinkedIn message"
        : "email"

  let regenerationSection = ""
  const trimmedSuggestions = regeneration?.suggestions.trim()
  if (regeneration && trimmedSuggestions) {
    const previousText =
      format === "email" && regeneration.previousDraft.subject
        ? `Subject: ${regeneration.previousDraft.subject.trim()}\n\n${regeneration.previousDraft.body.trim()}`
        : regeneration.previousDraft.body.trim()

    regenerationSection = `Previous draft:
${previousText}

The user has reviewed the previous draft and wants these specific changes in the next version: ${trimmedSuggestions}. Apply these changes while keeping the same voice and style. These are one-time instructions for this draft only, not permanent rules.

`
  }

  return `${regenerationSection}${followUp ? formatFollowUpContext(followUp, format) : ""}${interactionContextSection ?? ""}Write an outreach ${formatLabel} for this contact.

Contact:
- Name: ${contact.name}
- Company: ${contact.company}
- Role: ${contact.role}
- City: ${contact.city || "Unknown"}
- University: ${universities || "Unknown"}
- Goal: ${contact.goal}
- Connection type: ${contact.connectionType}
- Source: ${contact.source}
- Mutual connections on LinkedIn: ${contact.mutualCount ?? 0}
- Notes: ${contact.notes || "None"}

Shared connections with other contacts on the board:
${sharedConnections}

Verified shared university with this contact:
${verifiedUniversityOverlap}

Goal-specific guidance:
${goalInstructions}

Writing samples to match (${formatLabel}):
${formatVoiceContext(successfulDrafts, voiceSamples, format)}

${formatInstructions}

Return ONLY valid JSON with keys: subject, body`
}

type InteractionSummaryRow = {
  summary_discussed: string
  summary_commitments: string | null
  summary_followups: string | null
}

type SentDraftRow = {
  subject: string | null
  body: string
  sent_at: string
}

const VALID_FORMATS: DraftOutreachFormat[] = ["email", "linkedin_note", "linkedin_message"]

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY. Add it to .env.local." },
      { status: 500 },
    )
  }

  let body: {
    contact?: DraftOutreachContact
    contacts?: Contact[]
    format?: DraftOutreachFormat
    profileId?: string | null
    suggestions?: string | null
    previousDraft?: { subject?: string | null; body?: string } | null
    contactStage?: Contact["stage"]
    fromFollowUpsPage?: boolean
    followUpMode?: boolean
    preCallNotes?: string | null
    callSummary?: {
      discussed: string | string[]
      commitments?: string | string[]
      next_steps?: string | string[]
      not_covered?: string | string[] | null
    } | null
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const contact = body.contact
  const contacts = body.contacts ?? []
  const format = body.format
  const profileId = body.profileId ?? null
  const suggestions = body.suggestions?.trim() || null
  const previousDraftBody = body.previousDraft?.body?.trim()
  const regeneration =
    suggestions && previousDraftBody
      ? {
          suggestions,
          previousDraft: {
            subject: body.previousDraft?.subject ?? null,
            body: previousDraftBody,
          },
        }
      : null

  const contactStage = body.contactStage
  const fromFollowUpsPage = body.fromFollowUpsPage ?? false
  const followUpMode = body.followUpMode ?? false
  const discussedItems = parseSummaryBulletField(body.callSummary?.discussed)
  const postCallContext =
    discussedItems.length > 0
      ? {
          preCallNotes: body.preCallNotes?.trim() ?? "",
          callSummary: {
            discussed: discussedItems,
            commitments: parseSummaryBulletField(body.callSummary?.commitments),
            next_steps: parseSummaryBulletField(body.callSummary?.next_steps),
            not_covered: parseNullableSummaryBulletField(body.callSummary?.not_covered),
          },
        }
      : null

  if (!contact || !format || !VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: "contact and format (email, linkedin_note, or linkedin_message) are required" },
      { status: 400 },
    )
  }

  let voiceSampleQuery = supabaseServer
    .from("voice_samples")
    .select("label, email_body")
    .eq("type", format)
    .order("created_at", { ascending: false })

  if (profileId) {
    voiceSampleQuery = voiceSampleQuery.eq("profile_id", profileId)
  }

  let successfulDraftQuery = supabaseServer
    .from("outreach_drafts")
    .select("subject, body")
    .eq("format", format)
    .eq("was_successful", true)
    .order("created_at", { ascending: false })

  if (profileId) {
    successfulDraftQuery = successfulDraftQuery.eq("profile_id", profileId)
  }

  const profileQuery = profileId
    ? supabaseServer.from("voice_profiles").select("style_instructions").eq("id", profileId).maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const userProfileQuery = fetchUserProfileServer()

  const isAdvancedStage =
    contactStage === "responded" || contactStage === "met_connected"

  const shouldFetchSentDraft =
    contactStage === "in_progress" || fromFollowUpsPage

  const sentDraftQuery = shouldFetchSentDraft
    ? supabaseServer
        .from("outreach_drafts")
        .select("subject, body, sent_at")
        .eq("contact_id", contact.id)
        .not("sent_at", "is", null)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const interactionSummaryQuery = isAdvancedStage || shouldFetchSentDraft
    ? supabaseServer
        .from("interactions")
        .select("*")
        .eq("contact_id", contact.id)
        .not("summary_discussed", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [
    { data: voiceSampleRows, error: voiceError },
    { data: successfulDraftRows, error: successfulError },
    { data: profileRow, error: profileError },
    userProfile,
    { data: sentDraftRow, error: sentDraftError },
    { data: interactionSummaryRow, error: interactionSummaryError },
  ] = await Promise.all([
    voiceSampleQuery,
    successfulDraftQuery,
    profileQuery,
    userProfileQuery,
    sentDraftQuery,
    interactionSummaryQuery,
  ])

  if (voiceError) {
    return NextResponse.json({ error: voiceError.message }, { status: 500 })
  }

  if (successfulError) {
    return NextResponse.json({ error: successfulError.message }, { status: 500 })
  }

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (sentDraftError) {
    return NextResponse.json({ error: sentDraftError.message }, { status: 500 })
  }

  if (interactionSummaryError) {
    return NextResponse.json({ error: interactionSummaryError.message }, { status: 500 })
  }

  const boardContact = contacts.find((item) => item.id === contact.id)
  const sharedConnections = boardContact
    ? formatSharedConnectionsForPrompt(boardContact, contacts)
    : "None"
  const verifiedUniversityOverlap = formatVerifiedUniversityOverlap(userProfile, contact)
  const followUp =
    sentDraftRow && shouldFetchSentDraft
      ? {
          subject: (sentDraftRow as SentDraftRow).subject,
          body: (sentDraftRow as SentDraftRow).body,
          sentAt: (sentDraftRow as SentDraftRow).sent_at,
        }
      : null

  let interactionContextSection = ""

  if (postCallContext) {
    interactionContextSection = formatPostCallDraftContext(postCallContext)
  } else if (isAdvancedStage) {
    if (interactionSummaryRow) {
      interactionContextSection = formatRecentInteractionContext({
        summary_discussed: (interactionSummaryRow as InteractionSummaryRow).summary_discussed,
        summary_commitments: (interactionSummaryRow as InteractionSummaryRow).summary_commitments,
        summary_followups: (interactionSummaryRow as InteractionSummaryRow).summary_followups,
      })
    } else if (followUpMode) {
      interactionContextSection = formatPriorContactFollowUpContext()
    }
  } else if (
    interactionSummaryRow &&
    shouldFetchSentDraft &&
    followUpMode
  ) {
    interactionContextSection = formatInteractionSummaryContext(
      interactionSummaryRow as InteractionSummaryRow,
    )
  }

  console.log("[draft-outreach] context debug", {
    contactId: contact.id,
    contactStage,
    followUpMode,
    isAdvancedStage,
    interactionSummaryFound: Boolean(interactionSummaryRow),
    interactionSummaryRow,
    interactionContextIncluded: interactionContextSection.length > 0,
  })

  const userPrompt = buildUserPrompt(
    contact,
    sharedConnections,
    verifiedUniversityOverlap,
    format,
    (successfulDraftRows ?? []) as SuccessfulDraftRow[],
    (voiceSampleRows ?? []) as VoiceSampleRow[],
    regeneration,
    followUp,
    interactionContextSection,
  )

  const styleInstructions =
    profileId && profileRow?.style_instructions ? profileRow.style_instructions : null

  const systemPrompt = buildSystemPrompt(styleInstructions, format, userProfile)

  console.log("[draft-outreach] full prompt to Claude", {
    system: systemPrompt,
    user: userPrompt,
  })

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    return NextResponse.json(
      { error: `Anthropic API error: ${errorBody}` },
      { status: response.status },
    )
  }

  const result = await response.json()
  const content = result.content?.[0]?.text

  if (typeof content !== "string") {
    return NextResponse.json(
      { error: "Unexpected response from Anthropic API" },
      { status: 500 },
    )
  }

  try {
    const draft = extractJsonObject(content)

    if (!draft.body.trim()) {
      return NextResponse.json({ error: "Generated draft was empty" }, { status: 500 })
    }

    const trimmedBody = normalizeDraftSignOff(draft.body, userProfile?.fullName)

    return NextResponse.json({
      subject: format === "email" ? draft.subject : null,
      body: trimmedBody,
      characterCount: trimmedBody.length,
      characterLimit: isLinkedInDraftFormat(format) ? getCharacterLimitForFormat(format) : null,
    })
  } catch {
    return NextResponse.json({ error: "Failed to parse generated draft" }, { status: 500 })
  }
}
