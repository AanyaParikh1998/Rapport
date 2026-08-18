import { NextResponse } from "next/server"
import { anthropicErrorResponse } from "@/lib/anthropic-api"

type LinkedInExtractedFields = {
  name: string
  company: string
  role: string
  city: string
  undergraduate_university: string
  graduate_university: string
  mutual_count: number | null
  email: string
}

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

function extractEmailFromText(text: string): string {
  const match = text.match(EMAIL_PATTERN)
  return match?.[0]?.trim().toLowerCase() ?? ""
}

function parseMutualCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value)
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10)
    return Number.isNaN(parsed) || parsed < 0 ? null : parsed
  }

  return null
}

function extractJsonObject(
  text: string,
  fallbackEmail: string,
): LinkedInExtractedFields {
  const trimmed = text.trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not parse LinkedIn profile response")
  }

  const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<LinkedInExtractedFields>
  const extractedEmail =
    typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : ""

  return {
    name: typeof parsed.name === "string" ? parsed.name : "",
    company: typeof parsed.company === "string" ? parsed.company : "",
    role: typeof parsed.role === "string" ? parsed.role : "",
    city: typeof parsed.city === "string" ? parsed.city : "",
    undergraduate_university:
      typeof parsed.undergraduate_university === "string"
        ? parsed.undergraduate_university
        : "",
    graduate_university:
      typeof parsed.graduate_university === "string" ? parsed.graduate_university : "",
    mutual_count: parseMutualCount(parsed.mutual_count),
    email: extractedEmail || fallbackEmail,
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

  const fallbackEmail = extractEmailFromText(text)

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Extract contact details from this pasted LinkedIn profile text.

Return ONLY valid JSON with exactly these keys:
- name
- company
- role
- city
- undergraduate_university
- graduate_university
- mutual_count
- email

Use an empty string for any text field you cannot determine.
For mutual_count, extract the number from phrases like "47 mutual connections" or "3 mutual connections".
Return null for mutual_count if no mutual connection count is found.

For email, look in the contact info section, "Contact information", or anywhere an email address appears in the pasted text.
Return an empty string if no email is found.

For education, use the degree type to determine which field to use:
- Undergraduate degrees (BA, BS, BBA, AB, BEng, or similar) → undergraduate_university
- Graduate degrees (MBA, MS, MA, JD, MD, PhD, MEng, or similar) → graduate_university
If someone has both an undergraduate and a graduate degree, populate BOTH fields, even if it is the same institution for both. Do not leave graduate_university empty just because it matches undergraduate_university — repeat the school name in both fields. For example, someone with a Bachelor's and a Master's from "University of California, Berkeley" should have undergraduate_university and graduate_university both set to "University of California, Berkeley".

For city, determine the person's CURRENT location:
- If they are currently enrolled in an undergraduate or graduate program (e.g. a degree listed as in-progress, "Candidate", "Class of" a current or future year, or an education entry with no end date), use the city where that school is located — not the city of any company or past employer.
- Otherwise, use the city associated with their current company/role, or their profile's listed location if no current company city is available.

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
    const extracted = extractJsonObject(content, fallbackEmail)
    return NextResponse.json(extracted)
  } catch {
    return NextResponse.json(
      { error: "Failed to parse extracted LinkedIn fields" },
      { status: 500 },
    )
  }
}
