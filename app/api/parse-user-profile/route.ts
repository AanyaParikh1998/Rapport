import { NextResponse } from "next/server"
import { anthropicErrorResponse } from "@/lib/anthropic-api"

type ParsedUserProfile = {
  full_name: string
  current_company: string
  role: string
  location: string
  undergraduate_university: string
  graduate_university: string
  background: string
}

function extractJsonObject(text: string): ParsedUserProfile {
  const trimmed = text.trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not parse user profile response")
  }

  const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<ParsedUserProfile>

  return {
    full_name: typeof parsed.full_name === "string" ? parsed.full_name : "",
    current_company: typeof parsed.current_company === "string" ? parsed.current_company : "",
    role: typeof parsed.role === "string" ? parsed.role : "",
    location: typeof parsed.location === "string" ? parsed.location : "",
    undergraduate_university:
      typeof parsed.undergraduate_university === "string"
        ? parsed.undergraduate_university
        : "",
    graduate_university:
      typeof parsed.graduate_university === "string" ? parsed.graduate_university : "",
    background: typeof parsed.background === "string" ? parsed.background : "",
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

  let body: { text?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const text = body.text?.trim()

  if (!text) {
    return NextResponse.json({ error: "LinkedIn profile text is required" }, { status: 400 })
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 768,
      messages: [
        {
          role: "user",
          content: `Extract the profile owner's details from this pasted LinkedIn profile text. This is the user's own profile, not someone else's.

Return ONLY valid JSON with exactly these keys:
- full_name
- current_company (most recent company or school)
- role (most recent role or program)
- location
- undergraduate_university
- graduate_university
- background (a 2-3 sentence summary of their professional experience extracted from the work history section)

Use an empty string for any text field you cannot determine.

For education, use the degree type to determine which field to use:
- Undergraduate degrees (BA, BS, BBA, AB, BEng, or similar) → undergraduate_university
- Graduate degrees (MBA, MS, MA, JD, MD, PhD, MEng, or similar) → graduate_university
If someone has both, populate both fields with the appropriate school for each degree.

For background, summarize their career path and industries based on work history. Keep it to 2-3 sentences.

LinkedIn profile text:
${text}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
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
    const extracted = extractJsonObject(content)
    return NextResponse.json(extracted)
  } catch {
    return NextResponse.json(
      { error: "Failed to parse extracted profile fields" },
      { status: 500 },
    )
  }
}
