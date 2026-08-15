import { NextResponse } from "next/server"
import { anthropicErrorResponse } from "@/lib/anthropic-api"
import { fetchUserProfileServer } from "@/lib/user-profile-prompt"
import { formatSenderForSystemPrompt } from "@/lib/user-profile-format"
import { parseBulletItems } from "@/lib/interactions"

type PrepCallInteraction = {
  createdAt: string
  notes: string
  summaryDiscussed?: string | null
  summaryCommitments?: string | null
  summaryFollowups?: string | null
}

type PrepCallContact = {
  id?: string
  name: string
  role: string
  company: string
  city?: string
  undergraduateUniversity?: string
  graduateUniversity?: string
  connectionType: string
  mutualCount?: number | null
  goal: string
  notes?: string
  linkedinUrl?: string
}

type PrepCallResponse = {
  opening: string
  talking_points: string[]
  questions: string[]
  commitments_to_address: string[]
}

function extractJsonObject(text: string): PrepCallResponse {
  const trimmed = text.trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not parse prep call response")
  }

  const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<PrepCallResponse>

  return {
    opening: typeof parsed.opening === "string" ? parsed.opening.trim() : "",
    talking_points: Array.isArray(parsed.talking_points)
      ? parsed.talking_points.filter((item): item is string => typeof item === "string")
      : [],
    questions: Array.isArray(parsed.questions)
      ? parsed.questions.filter((item): item is string => typeof item === "string")
      : [],
    commitments_to_address: Array.isArray(parsed.commitments_to_address)
      ? parsed.commitments_to_address.filter((item): item is string => typeof item === "string")
      : [],
  }
}

function formatUniversity(contact: PrepCallContact): string {
  const schools = [contact.undergraduateUniversity, contact.graduateUniversity]
    .map((school) => school?.trim())
    .filter(Boolean)

  return schools.length > 0 ? schools.join(", ") : "Not provided"
}

function formatInteractionHistory(interactions: PrepCallInteraction[]): string {
  if (interactions.length === 0) {
    return "No previous interactions recorded."
  }

  return interactions
    .map((interaction) => {
      const date = new Date(interaction.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      const parts = [`${date}: ${interaction.notes}`]

      if (interaction.summaryDiscussed?.trim()) {
        parts.push(`  Discussed: ${interaction.summaryDiscussed.trim()}`)
      }
      if (interaction.summaryCommitments?.trim()) {
        parts.push(`  Commitments: ${interaction.summaryCommitments.trim()}`)
      }
      if (interaction.summaryFollowups?.trim()) {
        parts.push(`  Follow-ups: ${interaction.summaryFollowups.trim()}`)
      }

      return parts.join("\n")
    })
    .join("\n\n")
}

function collectOpenCommitments(interactions: PrepCallInteraction[]): string[] {
  const commitments: string[] = []

  for (const interaction of interactions) {
    if (!interaction.summaryCommitments?.trim()) continue
    commitments.push(...parseBulletItems(interaction.summaryCommitments))
  }

  return commitments
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
    contact?: PrepCallContact
    interactions?: PrepCallInteraction[]
    preCallNotes?: string
  }

  try {
    body = await request.json()
  } catch (error) {
    console.error("[prep-call] failed to parse request body:", error)
    return NextResponse.json(
      { error: "Invalid request body. Expected JSON with contact, interactions, and preCallNotes." },
      { status: 400 },
    )
  }

  console.log("prep-call request body:", JSON.stringify(body))

  const contact = body.contact
  if (!contact || typeof contact !== "object") {
    return NextResponse.json(
      { error: "Missing contact object in request body." },
      { status: 400 },
    )
  }

  if (!contact.name?.trim()) {
    return NextResponse.json(
      {
        error: "Contact name is required.",
        details: {
          contactId: contact.id ?? null,
          receivedFields: Object.keys(contact),
        },
      },
      { status: 400 },
    )
  }

  const interactions = Array.isArray(body.interactions) ? body.interactions : []
  const preCallNotes = body.preCallNotes?.trim() ?? ""

  console.log("[prep-call] validated request", {
    contactId: contact.id ?? null,
    contactName: contact.name,
    interactionCount: interactions.length,
    preCallNotesLength: preCallNotes.length,
  })

  let userProfile
  try {
    userProfile = await fetchUserProfileServer()
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load user profile" },
      { status: 500 },
    )
  }

  const openCommitments = collectOpenCommitments(interactions)
  const backgroundParts = [contact.notes?.trim()].filter(Boolean)
  const userPrompt = [
    "Help me prepare for an upcoming networking call.",
    "",
    "Contact:",
    `- Name: ${contact.name}`,
    `- Role: ${contact.role || "Not provided"}`,
    `- Company: ${contact.company || "Not provided"}`,
    `- City: ${contact.city?.trim() || "Not provided"}`,
    `- University: ${formatUniversity(contact)}`,
    `- Connection type: ${contact.connectionType || "Not provided"}`,
    contact.mutualCount != null
      ? `- Mutual connections: ${contact.mutualCount}`
      : null,
    `- Goal for this relationship: ${contact.goal || "Not provided"}`,
    backgroundParts.length > 0 ? `- Background notes: ${backgroundParts.join(" ")}` : null,
    "",
    "My goals for this specific call:",
    preCallNotes || "Not specified yet.",
    "",
    "Previous interaction history (most recent first):",
    formatInteractionHistory(interactions),
    "",
    openCommitments.length > 0
      ? `Open commitments from past interactions:\n${openCommitments.map((item) => `- ${item}`).join("\n")}`
      : "Open commitments from past interactions: none recorded.",
    "",
    "My background:",
    userProfile?.background?.trim() ||
      formatSenderForSystemPrompt(userProfile).replace(/^The sender is /, "") ||
      "Not provided.",
  ]
    .filter((line) => line !== null)
    .join("\n")

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
      system:
        "You are helping someone prepare for a networking call. Generate specific, thoughtful talking points based on the contact's background and the relationship history. Be concrete and reference specific details. Never use em dashes. Keep each point to one sentence. Return only valid JSON.",
      messages: [
        {
          role: "user",
          content: `${userPrompt}

Return ONLY valid JSON with this shape:
{
  "opening": "one suggested way to open the call, warm and specific",
  "talking_points": ["3-5 specific topics to cover based on their background and the goal"],
  "questions": ["3-4 genuine questions to ask them"],
  "commitments_to_address": ["any open commitments from previous interactions that should be raised, empty array if none"]
}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("[prep-call] Anthropic API error", {
      status: response.status,
      contactId: contact.id ?? null,
      errorBody,
    })
    return anthropicErrorResponse(response.status, errorBody)
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
    const prep = extractJsonObject(content)

    if (!prep.opening && prep.talking_points.length === 0) {
      return NextResponse.json({ error: "Generated prep was empty" }, { status: 500 })
    }

    console.log("[prep-call] generated prep successfully", {
      contactId: contact.id ?? null,
      talkingPointCount: prep.talking_points.length,
    })

    return NextResponse.json(prep)
  } catch (error) {
    console.error("[prep-call] failed to parse generated prep:", error)
    return NextResponse.json(
      { error: "Failed to parse generated prep from Claude response." },
      { status: 500 },
    )
  }
}
