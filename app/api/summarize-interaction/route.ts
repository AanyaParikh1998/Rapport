import { NextResponse } from "next/server"
import { parsePostCallSummaryFromApi } from "@/lib/post-call-context"

type StandardSummaryResponse = {
  discussed: string
  commitments: string
  followups: string
}

function extractStandardSummary(text: string): StandardSummaryResponse {
  const trimmed = text.trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not parse summary response")
  }

  const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<StandardSummaryResponse>

  return {
    discussed: typeof parsed.discussed === "string" ? parsed.discussed.trim() : "",
    commitments: typeof parsed.commitments === "string" ? parsed.commitments.trim() : "",
    followups: typeof parsed.followups === "string" ? parsed.followups.trim() : "",
  }
}

function extractPostCallSummary(text: string) {
  const trimmed = text.trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not parse summary response")
  }

  const parsed = JSON.parse(trimmed.slice(start, end + 1))
  return parsePostCallSummaryFromApi(parsed)
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY. Add it to .env.local." },
      { status: 500 },
    )
  }

  let body: { notes?: string; preCallNotes?: string; postCallMode?: boolean }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const notes = body.notes?.trim()
  const preCallNotes = body.preCallNotes?.trim() ?? ""
  const isPostCallMode = body.postCallMode === true

  if (!notes) {
    return NextResponse.json({ error: "notes are required" }, { status: 400 })
  }

  const userContent = isPostCallMode
    ? `The user planned to discuss: ${preCallNotes || "Nothing was specified before the call."}

What actually happened (from their notes):
${notes}

Summarize the call notes into structured bullet points. Each field should be a list of short, scannable points. Never write long paragraphs. Each bullet should be one sentence maximum. Never use em dashes.

Return JSON with these fields:
{
  discussed: string[] (array of bullet points covering the key topics discussed),
  commitments: string[] (array of specific commitments made by either party, empty array if none),
  next_steps: string[] (array of clear next steps, empty array if none),
  not_covered: string[] | null (array of topics from pre-call notes that did not come up, null if no pre-call notes were provided or everything was covered)
}

Return ONLY valid JSON.`
    : `Summarize these interaction notes into three sections:

1. What was discussed (2-3 sentences)
2. Commitments or next steps (bullet points if any, otherwise empty string)
3. Anything to follow up on (bullet points if any, otherwise empty string)

Notes:
${notes}

Return ONLY valid JSON with keys: discussed (string), commitments (string), followups (string)`

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
        "You summarize meeting and interaction notes into concise structured bullet points. Never use em dashes. Use commas or periods instead. Return only valid JSON.",
      messages: [{ role: "user", content: userContent }],
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
    if (isPostCallMode) {
      const summary = extractPostCallSummary(content)

      if (summary.discussed.length === 0) {
        return NextResponse.json({ error: "Generated summary was empty" }, { status: 500 })
      }

      return NextResponse.json(summary)
    }

    const summary = extractStandardSummary(content)

    if (!summary.discussed) {
      return NextResponse.json({ error: "Generated summary was empty" }, { status: 500 })
    }

    return NextResponse.json(summary)
  } catch {
    return NextResponse.json({ error: "Failed to parse generated summary" }, { status: 500 })
  }
}
