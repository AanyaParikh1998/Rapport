import { parseBulletItems } from "@/lib/interactions"

export type PreCallTalkingPoints = {
  opening?: string
  talking_points: string[]
  questions: string[]
  commitments_to_address: string[]
  generated_at?: string
}

export type PostCallSummary = {
  discussed: string[]
  not_covered: string[] | null
  commitments: string[]
  next_steps: string[]
}

export type PostCallDraftContext = {
  preCallNotes: string
  callSummary: PostCallSummary
}

export function parsePreCallTalkingPoints(raw: unknown): PreCallTalkingPoints | null {
  if (raw == null) return null

  let parsed: Partial<PreCallTalkingPoints>

  if (typeof raw === "string") {
    if (!raw.trim()) return null
    try {
      parsed = JSON.parse(raw) as Partial<PreCallTalkingPoints>
    } catch {
      return null
    }
  } else if (typeof raw === "object") {
    parsed = raw as Partial<PreCallTalkingPoints>
  } else {
    return null
  }

  const result: PreCallTalkingPoints = {
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
    generated_at:
      typeof parsed.generated_at === "string" && parsed.generated_at.trim()
        ? parsed.generated_at
        : undefined,
  }

  if (
    !result.opening &&
    result.talking_points.length === 0 &&
    result.questions.length === 0 &&
    result.commitments_to_address.length === 0
  ) {
    return null
  }

  return result
}

export function formatPrepGeneratedLabel(generatedAt: string): string {
  const date = new Date(generatedAt)
  if (Number.isNaN(date.getTime())) return "Generated recently"

  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)

  return `Generated ${formatted}`
}

export function hasPreCallTalkingPoints(points: PreCallTalkingPoints | null): boolean {
  if (!points) return false
  return Boolean(
    points.opening?.trim() ||
      points.talking_points.length > 0 ||
      points.questions.length > 0 ||
      points.commitments_to_address.length > 0,
  )
}

export function formatTodayDateLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function parseSummaryBulletField(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (typeof value === "string" && value.trim()) {
    return parseBulletItems(value)
  }

  return []
}

export function parseNullableSummaryBulletField(value: unknown): string[] | null {
  if (value == null) return null

  const items = parseSummaryBulletField(value)
  return items.length > 0 ? items : null
}

export function serializeSummaryBullets(items: string[]): string | null {
  const cleaned = items.map((item) => item.trim()).filter(Boolean)
  if (cleaned.length === 0) return null

  return cleaned.map((item) => `- ${item}`).join("\n")
}

export function formatSummaryBulletsForPrompt(items: string[]): string {
  if (items.length === 0) return "None noted"

  return items.map((item) => `- ${item}`).join("\n")
}

export function parsePostCallSummaryFromApi(data: {
  discussed?: unknown
  not_covered?: unknown
  commitments?: unknown
  next_steps?: unknown
}): PostCallSummary {
  return {
    discussed: parseSummaryBulletField(data.discussed),
    not_covered: parseNullableSummaryBulletField(data.not_covered),
    commitments: parseSummaryBulletField(data.commitments),
    next_steps: parseSummaryBulletField(data.next_steps),
  }
}

export function postCallSummaryFromTimelineEntry(entry: {
  summaryDiscussed: string | null
  summaryCommitments: string | null
  summaryFollowups: string | null
  summaryNotCovered: string | null
}): PostCallSummary {
  return {
    discussed: parseSummaryBulletField(entry.summaryDiscussed),
    not_covered: parseNullableSummaryBulletField(entry.summaryNotCovered),
    commitments: parseSummaryBulletField(entry.summaryCommitments),
    next_steps: parseSummaryBulletField(entry.summaryFollowups),
  }
}

export function formatPostCallSummaryAsEditableText(summary: PostCallSummary): string {
  const sections: string[] = []

  if (summary.discussed.length > 0) {
    sections.push(summary.discussed.join("\n"))
  }

  if (summary.commitments.length > 0) {
    sections.push(
      ["Commitments:", ...summary.commitments.map((item) => `- ${item}`)].join("\n"),
    )
  }

  if (summary.next_steps.length > 0) {
    sections.push(["Next steps:", ...summary.next_steps.map((item) => `- ${item}`)].join("\n"))
  }

  if (summary.not_covered && summary.not_covered.length > 0) {
    sections.push(
      ["Topics not covered:", ...summary.not_covered.map((item) => `- ${item}`)].join("\n"),
    )
  }

  return sections.join("\n\n")
}

export type PostCallModalEditState = {
  interactionId: string
  dateLabel: string
  savedSummary: PostCallSummary
  initialTextareaValue: string
}
