import { NextResponse } from "next/server"
import {
  buildForwardableDraftPrompt,
  buildIntroducerDraftPrompt,
  contactToIntroContext,
  normalizeForwardableDraftBody,
  normalizeIntroducerDraftBody,
  type IntroDraftFormat,
  type IntroDraftType,
  introFormatToOutreachFormat,
} from "@/lib/draft-intro-context"
import type { Contact } from "@/lib/data"
import { supabaseServer } from "@/lib/supabase/server"
import {
  fetchUserProfileServer,
  formatSenderForSystemPrompt,
  getDraftSignOff,
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

type DraftResponse = {
  subject: string | null
  body: string
}

const VALID_FORMATS: IntroDraftFormat[] = ["email", "linkedin_message"]
const VALID_DRAFT_TYPES: IntroDraftType[] = ["introducer", "forwardable"]

function buildSystemPrompt(
  styleInstructions: string | null,
  draftType: IntroDraftType,
  format: IntroDraftFormat,
  userProfile: UserProfile | null,
): string {
  const signOff = getDraftSignOff(userProfile?.fullName)
  const base =
    draftType === "introducer"
      ? `You are a personal outreach assistant helping the sender request warm introductions from mutual connections. Write in the exact style of the sample messages provided. Match tone, length, and formality. Never use generic corporate language. Never use em dashes. Use commas or periods instead. Always sign off with '${signOff}' for messages TO the introducer. Never use placeholder text. Never fabricate shared connections.`
      : "You are helping write a forwardable introduction blurb that a mutual connection can send to a target contact. Write naturally as if the introducer is forwarding it. Never use em dashes. Do not sign off as the sender. Never use placeholder text. Never fabricate background details about the sender."

  const parts = [base, formatSenderForSystemPrompt(userProfile)]

  const trimmed = styleInstructions?.trim()
  if (trimmed) {
    parts.push(`Follow these style rules strictly: ${trimmed}`)
  }

  if (format === "linkedin_message") {
    parts.push("This is a LinkedIn message. Keep it concise.")
  }

  return parts.join("\n\n")
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

function formatSuccessfulDraftList(drafts: SuccessfulDraftRow[], format: IntroDraftFormat): string {
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
  format: IntroDraftFormat,
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

async function fetchVoiceContext(profileId: string | null, format: IntroDraftFormat) {
  const outreachFormat = introFormatToOutreachFormat(format)

  let voiceSampleQuery = supabaseServer
    .from("voice_samples")
    .select("label, email_body")
    .eq("type", outreachFormat)
    .order("created_at", { ascending: false })

  if (profileId) {
    voiceSampleQuery = voiceSampleQuery.eq("profile_id", profileId)
  }

  let successfulDraftQuery = supabaseServer
    .from("outreach_drafts")
    .select("subject, body")
    .eq("format", outreachFormat)
    .eq("was_successful", true)
    .order("created_at", { ascending: false })

  if (profileId) {
    successfulDraftQuery = successfulDraftQuery.eq("profile_id", profileId)
  }

  const profileQuery = profileId
    ? supabaseServer
        .from("voice_profiles")
        .select("style_instructions")
        .eq("id", profileId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [
    { data: voiceSampleRows, error: voiceError },
    { data: successfulDraftRows, error: successfulError },
    { data: profileRow, error: profileError },
  ] = await Promise.all([voiceSampleQuery, successfulDraftQuery, profileQuery])

  if (voiceError) throw new Error(voiceError.message)
  if (successfulError) throw new Error(successfulError.message)
  if (profileError) throw new Error(profileError.message)

  return {
    voiceContext: formatVoiceContext(
      (successfulDraftRows ?? []) as SuccessfulDraftRow[],
      (voiceSampleRows ?? []) as VoiceSampleRow[],
      format,
    ),
    styleInstructions:
      profileId && profileRow?.style_instructions ? profileRow.style_instructions : null,
  }
}

async function callAnthropic(
  apiKey: string,
  system: string,
  userPrompt: string,
): Promise<DraftResponse> {
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
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Anthropic API error: ${errorBody}`)
  }

  const result = await response.json()
  const content = result.content?.[0]?.text

  if (typeof content !== "string") {
    throw new Error("Unexpected response from Anthropic API")
  }

  const draft = extractJsonObject(content)
  if (!draft.body.trim()) {
    throw new Error("Generated draft was empty")
  }

  return draft
}

function normalizeDraft(
  draft: DraftResponse,
  draftType: IntroDraftType,
  format: IntroDraftFormat,
  userProfile: UserProfile | null,
): DraftResponse {
  const body =
    draftType === "introducer"
      ? normalizeIntroducerDraftBody(draft.body, userProfile?.fullName)
      : normalizeForwardableDraftBody(draft.body)

  return {
    subject: format === "email" ? draft.subject : null,
    body,
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY. Add it to .env.local." },
      { status: 500 },
    )
  }

  let body: {
    targetContact?: Contact
    introducerContact?: Contact
    sharedReason?: string
    format?: IntroDraftFormat
    profileId?: string | null
    draftType?: IntroDraftType | null
    suggestions?: string | null
    previousDraft?: { subject?: string | null; body?: string } | null
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const targetContact = body.targetContact
  const introducerContact = body.introducerContact
  const sharedReason = body.sharedReason?.trim()
  const format = body.format
  const profileId = body.profileId ?? null
  const draftType = body.draftType ?? null
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

  if (!targetContact || !introducerContact || !sharedReason || !format) {
    return NextResponse.json(
      { error: "targetContact, introducerContact, sharedReason, and format are required" },
      { status: 400 },
    )
  }

  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: "format must be email or linkedin_message" },
      { status: 400 },
    )
  }

  if (draftType && !VALID_DRAFT_TYPES.includes(draftType)) {
    return NextResponse.json(
      { error: "draftType must be introducer or forwardable" },
      { status: 400 },
    )
  }

  try {
    const [voiceResult, userProfile] = await Promise.all([
      fetchVoiceContext(profileId, format),
      fetchUserProfileServer(),
    ])
    const { voiceContext, styleInstructions } = voiceResult
    const target = contactToIntroContext(targetContact)
    const introducer = contactToIntroContext(introducerContact)

    if (draftType) {
      const userPrompt =
        draftType === "introducer"
          ? buildIntroducerDraftPrompt(
              target,
              introducer,
              sharedReason,
              format,
              voiceContext,
              userProfile,
              regeneration,
            )
          : buildForwardableDraftPrompt(
              target,
              introducer,
              sharedReason,
              format,
              voiceContext,
              userProfile,
              regeneration,
            )

      const draft = await callAnthropic(
        apiKey,
        buildSystemPrompt(styleInstructions, draftType, format, userProfile),
        userPrompt,
      )

      return NextResponse.json(normalizeDraft(draft, draftType, format, userProfile))
    }

    const [introducerDraft, forwardableDraft] = await Promise.all([
      callAnthropic(
        apiKey,
        buildSystemPrompt(styleInstructions, "introducer", format, userProfile),
        buildIntroducerDraftPrompt(
          target,
          introducer,
          sharedReason,
          format,
          voiceContext,
          userProfile,
          null,
        ),
      ),
      callAnthropic(
        apiKey,
        buildSystemPrompt(styleInstructions, "forwardable", format, userProfile),
        buildForwardableDraftPrompt(
          target,
          introducer,
          sharedReason,
          format,
          voiceContext,
          userProfile,
          null,
        ),
      ),
    ])

    return NextResponse.json({
      introducerDraft: normalizeDraft(introducerDraft, "introducer", format, userProfile),
      forwardableDraft: normalizeDraft(forwardableDraft, "forwardable", format, userProfile),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate intro drafts"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
