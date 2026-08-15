import type { Contact, Stage } from "@/lib/data"
import { shouldTrackCalendarForContact } from "@/lib/track-calendar"
import {
  formatCalendarEventStartTime,
  formatPastCallEndedLabel,
  getEventInstantMs,
} from "@/lib/calendar-time"

export type CalendarEvent = {
  id: string
  title: string
  description: string
  start: string
  end: string
  timeZone: string
  htmlLink: string | null
  hangoutLink: string | null
  attendeeEmails: string[]
  isAllDay: boolean
}

export type CalendarMatchSignal =
  | "attendee_email_exact"
  | "attendee_domain_company"
  | "full_name_in_title"
  | "first_name_title_scheduling_format"
  | "first_name_in_title"
  | "first_name_in_description"
  | "linkedin_slug_match"

export type CalendarEventMatchTiming = "upcoming" | "past"

export type CalendarEventMatch = {
  event: CalendarEvent
  contact: Contact
  timing: CalendarEventMatchTiming
  hoursFromNow: number
  action: CalendarMatchAction
  confidence: number
  confidenceLabel: string | null
  signal: CalendarMatchSignal
}

export type CalendarMatchAction = {
  type: "move_stage" | "log_only"
  targetStage: Stage | null
  interactionNote: string
  prompt: string
}

const MIN_MATCH_WORD_LENGTH = 4
const MIN_CONFIDENCE_TO_SHOW = 60

const CONFIDENCE_BY_SIGNAL: Record<CalendarMatchSignal, number> = {
  attendee_email_exact: 95,
  attendee_domain_company: 90,
  full_name_in_title: 85,
  linkedin_slug_match: 85,
  first_name_title_scheduling_format: 80,
  first_name_in_title: 65,
  first_name_in_description: 55,
}

const MIN_EVENT_DURATION_MS = 15 * 60 * 1000
const MAX_EVENT_DURATION_MS = 3 * 60 * 60 * 1000
const MAX_ATTENDEE_COUNT = 5

const NON_MEETING_TITLE_KEYWORDS = [
  "movie",
  "film",
  "cinema",
  "theatre",
  "theater",
  "concert",
  "show",
  "performance",
  "party",
  "birthday",
  "wedding",
  "anniversary",
  "vacation",
  "holiday",
  "flight",
  "travel",
  "gym",
  "workout",
  "yoga",
  "class",
  "appointment",
  "doctor",
  "dentist",
  "haircut",
  "personal",
]

const COMPANY_DOMAIN_STOP_WORDS = new Set([
  "inc",
  "llc",
  "ltd",
  "india",
  "the",
  "and",
  "capital",
  "partners",
  "group",
  "school",
  "university",
])

export function getCalendarMatchAction(
  contact: Contact,
  timing: CalendarEventMatchTiming,
): CalendarMatchAction {
  if (timing === "upcoming") {
    return {
      type: "move_stage",
      targetStage: "responded",
      interactionNote: "Call scheduled",
      prompt: "Move to Responded?",
    }
  }

  switch (contact.stage) {
    case "not_contacted":
    case "in_progress":
      return {
        type: "move_stage",
        targetStage: "responded",
        interactionNote: "Had a call",
        prompt: "Move to Responded?",
      }
    case "responded":
      return {
        type: "move_stage",
        targetStage: "met_connected",
        interactionNote: "Had a call",
        prompt: "Move to Met / Connected?",
      }
    case "met_connected":
      return {
        type: "log_only",
        targetStage: null,
        interactionNote: "Had a call",
        prompt: "Log Had a call?",
      }
  }
}

export function shouldShowCalendarBannerForContact(
  contact: Contact,
  timing: CalendarEventMatchTiming,
): boolean {
  if (timing === "upcoming") {
    return contact.stage === "not_contacted" || contact.stage === "in_progress"
  }

  return true
}

export function shouldOfferPastCallMetConnectedFollowUp(input: {
  timing: CalendarEventMatchTiming
  priorStage: Stage
  action: CalendarMatchAction
}): boolean {
  const { timing, priorStage, action } = input

  return (
    timing === "past" &&
    (priorStage === "not_contacted" || priorStage === "in_progress") &&
    action.type === "move_stage" &&
    action.targetStage === "responded"
  )
}

export function enrichCalendarEventMatch(
  match: CalendarEventMatch,
  contact: Contact,
  nowMs = Date.now(),
): CalendarEventMatch | null {
  if (!shouldTrackCalendarForContact(contact)) {
    return null
  }

  const timing = getCalendarEventTiming(match.event, nowMs)

  if (timing === "in_progress") {
    return null
  }

  if (!shouldShowCalendarBannerForContact(contact, timing)) {
    return null
  }

  const hoursFromNow =
    timing === "upcoming"
      ? Math.floor((getEventInstantMs(match.event.start) - nowMs) / (1000 * 60 * 60))
      : Math.floor((nowMs - getEventInstantMs(match.event.end)) / (1000 * 60 * 60))

  return {
    ...match,
    contact,
    timing,
    hoursFromNow,
    action: getCalendarMatchAction(contact, timing),
  }
}

export function canPrepForUpcomingCall(match: CalendarEventMatch): boolean {
  return (
    match.timing === "upcoming" &&
    (match.contact.stage === "in_progress" || match.contact.stage === "responded")
  )
}

export function getConfidenceLabel(confidence: number): string | null {
  if (confidence >= 75) return null
  if (confidence > MIN_CONFIDENCE_TO_SHOW) return "Likely match"
  return null
}

function normalizeWord(word: string): string {
  return word
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .toLowerCase()
}

function cleanContactName(name: string): string {
  return name.replace(/^Test:\s*/i, "").trim()
}

export function parseContactNameParts(name: string): {
  firstName: string
  lastName: string | null
} {
  const parts = cleanContactName(name)
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean)

  if (parts.length === 0) {
    return { firstName: "", lastName: null }
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null }
  }

  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1],
  }
}

export function parseUserExcludedNameParts(fullName: string): string[] {
  if (!fullName.trim()) return []

  return cleanContactName(fullName)
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean)
}

export type CalendarMatchingContext = {
  userExcludedNameParts: string[]
}

function buildExcludedNamePartSet(parts: string[]): Set<string> {
  return new Set(parts.map(normalizeWord).filter(Boolean))
}

export function buildFilteredEventTitleText(
  title: string,
  excludedNameParts: string[] | Set<string>,
): string {
  const excluded =
    excludedNameParts instanceof Set
      ? excludedNameParts
      : buildExcludedNamePartSet(excludedNameParts)

  if (excluded.size === 0) {
    return title.trim().toLowerCase()
  }

  let filtered = title.trim().toLowerCase()

  for (const part of excluded) {
    if (!part) continue
    filtered = filtered.replace(new RegExp(`\\b${escapeRegExp(part)}\\b`, "gi"), " ")
  }

  return filtered.replace(/\s+/g, " ").trim()
}

function buildEventTitleText(
  event: CalendarEvent,
  excludedNameParts: Set<string>,
): string {
  return buildFilteredEventTitleText(event.title, excludedNameParts)
}

function buildEventDescriptionText(event: CalendarEvent): string {
  return event.description.trim().toLowerCase()
}

function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase()
}

export function attendeeEmailMatchesContact(
  attendeeEmails: string[],
  contactEmail: string | undefined,
): boolean {
  const normalizedContactEmail = normalizeEmailAddress(contactEmail ?? "")
  if (!normalizedContactEmail) return false

  return attendeeEmails.some(
    (email) => normalizeEmailAddress(email) === normalizedContactEmail,
  )
}

function wordMeetsMinLength(word: string): boolean {
  return word.length >= MIN_MATCH_WORD_LENGTH
}

function textIncludesWord(text: string, word: string): boolean {
  if (!wordMeetsMinLength(word)) return false
  return text.includes(word)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function titleContainsToken(title: string, token: string): boolean {
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(token)}([^\\p{L}\\p{N}]|$)`, "iu")
  return pattern.test(title)
}

export function shouldSkipCalendarEvent(event: CalendarEvent): boolean {
  if (event.isAllDay) {
    return true
  }

  if (!isMeetingLengthEvent(event)) {
    return true
  }

  if (getCalendarEventDurationMs(event) > MAX_EVENT_DURATION_MS) {
    return true
  }

  if (event.attendeeEmails.length > MAX_ATTENDEE_COUNT) {
    return true
  }

  const title = event.title.trim()
  if (!title) {
    return false
  }

  const titleLower = title.toLowerCase()

  return NON_MEETING_TITLE_KEYWORDS.some((keyword) =>
    titleContainsToken(titleLower, keyword),
  )
}

export function getCalendarEventDurationMs(event: CalendarEvent): number {
  const startMs = getEventInstantMs(event.start)
  const endMs = getEventInstantMs(event.end)
  return Math.max(0, endMs - startMs)
}

export function isMeetingLengthEvent(event: CalendarEvent): boolean {
  return getCalendarEventDurationMs(event) >= MIN_EVENT_DURATION_MS
}

function isUserExcludedNamePart(word: string, excludedNameParts: Set<string>): boolean {
  const normalized = normalizeWord(word)
  return normalized.length > 0 && excludedNameParts.has(normalized)
}

function isUsableContactFirstName(firstName: string, excludedNameParts: Set<string>): boolean {
  return wordMeetsMinLength(firstName) && !isUserExcludedNamePart(firstName, excludedNameParts)
}

function isUsableContactLastName(lastName: string | null, excludedNameParts: Set<string>): boolean {
  return (
    Boolean(lastName) &&
    wordMeetsMinLength(lastName!) &&
    !isUserExcludedNamePart(lastName!, excludedNameParts)
  )
}

function companyNameToDomainRoots(company: string): string[] {
  const words = company
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !COMPANY_DOMAIN_STOP_WORDS.has(word))

  return [...new Set(words)].slice(0, 2)
}

function getEmailDomain(email: string): string | null {
  const atIndex = email.lastIndexOf("@")
  if (atIndex === -1) return null
  return email.slice(atIndex + 1).trim().toLowerCase()
}

export function attendeeEmailMatchesCompanyDomain(
  attendeeEmails: string[],
  company: string,
): boolean {
  const roots = companyNameToDomainRoots(company)
  if (roots.length === 0) return false

  return attendeeEmails.some((email) => {
    const domain = getEmailDomain(email)
    if (!domain) return false

    return roots.some(
      (root) =>
        domain === `${root}.com` ||
        domain === `${root}.co` ||
        domain === `${root}.io` ||
        domain.startsWith(`${root}.`),
    )
  })
}

export function extractLinkedInSlugParts(linkedinUrl: string): string[] {
  const match = linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/i)
  if (!match?.[1]) return []

  return [...new Set(match[1].split(/[-_]/).map(normalizeWord).filter(wordMeetsMinLength))]
}

export function isSchedulingToolTitle(title: string): boolean {
  const trimmed = title.trim()
  if (!trimmed) return false

  return (
    /\s+and\s+/i.test(trimmed) ||
    /^meeting between\s+/i.test(trimmed) ||
    /\s+with\s+/i.test(trimmed) ||
    /^call with\s+/i.test(trimmed) ||
    /^intro call/i.test(trimmed)
  )
}

function linkedInSlugMatchesEvent(
  linkedinUrl: string,
  event: CalendarEvent,
  contactFirstName: string,
  filteredTitleHaystack: string,
): boolean {
  const slugParts = extractLinkedInSlugParts(linkedinUrl)
  if (slugParts.length === 0) return false

  const firstName = normalizeWord(contactFirstName)
  if (!wordMeetsMinLength(firstName)) return false
  if (!slugParts.includes(firstName)) return false

  const descriptionHaystack = buildEventDescriptionText(event)

  return (
    textIncludesWord(filteredTitleHaystack, firstName) ||
    textIncludesWord(descriptionHaystack, firstName)
  )
}

function contactFirstNameMatchesEvent(
  firstName: string,
  event: CalendarEvent,
  filteredTitleHaystack: string,
  excludedNameParts: Set<string>,
): boolean {
  if (!isUsableContactFirstName(firstName, excludedNameParts)) return false

  return (
    textIncludesWord(filteredTitleHaystack, firstName) ||
    textIncludesWord(buildEventDescriptionText(event), firstName)
  )
}

export type ContactEventMatchScore = {
  confidence: number
  signal: CalendarMatchSignal
  signals: Array<{ signal: CalendarMatchSignal; confidence: number }>
}

export function scoreContactEventMatch(
  contact: Contact,
  event: CalendarEvent,
  context: CalendarMatchingContext = { userExcludedNameParts: [] },
): ContactEventMatchScore | null {
  if (!shouldTrackCalendarForContact(contact)) {
    return null
  }

  const { firstName, lastName } = parseContactNameParts(contact.name)
  const excludedNameParts = buildExcludedNamePartSet(context.userExcludedNameParts)

  if (shouldSkipCalendarEvent(event)) {
    return null
  }

  if (!isUsableContactFirstName(firstName, excludedNameParts)) {
    return null
  }

  const linkedinUrl = contact.linkedinUrl?.trim() ?? ""
  const hasLinkedIn = linkedinUrl.length > 0
  const titleHaystack = buildEventTitleText(event, excludedNameParts)
  const descriptionHaystack = buildEventDescriptionText(event)
  const schedulingFormat = isSchedulingToolTitle(event.title)

  const firstNameInTitle =
    isUsableContactFirstName(firstName, excludedNameParts) &&
    textIncludesWord(titleHaystack, firstName)
  const lastNameInTitle =
    firstNameInTitle &&
    isUsableContactLastName(lastName, excludedNameParts) &&
    textIncludesWord(titleHaystack, lastName!)
  const firstNameInDescription =
    isUsableContactFirstName(firstName, excludedNameParts) &&
    textIncludesWord(descriptionHaystack, firstName)
  const firstNameMatched = contactFirstNameMatchesEvent(firstName, event, titleHaystack, excludedNameParts)

  const triggeredSignals: Array<{ signal: CalendarMatchSignal; confidence: number }> = []

  if (attendeeEmailMatchesContact(event.attendeeEmails, contact.email)) {
    triggeredSignals.push({
      signal: "attendee_email_exact",
      confidence: CONFIDENCE_BY_SIGNAL.attendee_email_exact,
    })
  }

  if (
    hasLinkedIn &&
    contact.company.trim() &&
    attendeeEmailMatchesCompanyDomain(event.attendeeEmails, contact.company)
  ) {
    triggeredSignals.push({
      signal: "attendee_domain_company",
      confidence: CONFIDENCE_BY_SIGNAL.attendee_domain_company,
    })
  }

  if (
    hasLinkedIn &&
    firstNameMatched &&
    linkedInSlugMatchesEvent(linkedinUrl, event, firstName, titleHaystack)
  ) {
    triggeredSignals.push({
      signal: "linkedin_slug_match",
      confidence: CONFIDENCE_BY_SIGNAL.linkedin_slug_match,
    })
  }

  if (firstNameInTitle && lastNameInTitle) {
    triggeredSignals.push({
      signal: "full_name_in_title",
      confidence: CONFIDENCE_BY_SIGNAL.full_name_in_title,
    })
  }

  if (firstNameInTitle && schedulingFormat) {
    triggeredSignals.push({
      signal: "first_name_title_scheduling_format",
      confidence: CONFIDENCE_BY_SIGNAL.first_name_title_scheduling_format,
    })
  }

  if (firstNameInTitle) {
    triggeredSignals.push({
      signal: "first_name_in_title",
      confidence: CONFIDENCE_BY_SIGNAL.first_name_in_title,
    })
  }

  if (firstNameInDescription) {
    triggeredSignals.push({
      signal: "first_name_in_description",
      confidence: CONFIDENCE_BY_SIGNAL.first_name_in_description,
    })
  }

  if (triggeredSignals.length === 0) {
    return null
  }

  const best = triggeredSignals.reduce((top, current) =>
    current.confidence > top.confidence ? current : top,
  )

  if (best.confidence <= MIN_CONFIDENCE_TO_SHOW) {
    return null
  }

  return {
    confidence: best.confidence,
    signal: best.signal,
    signals: triggeredSignals,
  }
}

export function getCalendarEventTiming(
  event: CalendarEvent,
  nowMs = Date.now(),
): CalendarEventMatchTiming | "in_progress" {
  const startMs = getEventInstantMs(event.start)
  const endMs = getEventInstantMs(event.end)

  if (endMs <= nowMs) return "past"
  if (startMs > nowMs) return "upcoming"
  return "in_progress"
}

export function isPastCalendarEvent(event: CalendarEvent, nowMs = Date.now()): boolean {
  return getCalendarEventTiming(event, nowMs) === "past"
}

export function matchCalendarEventsToContacts(
  events: CalendarEvent[],
  contacts: Contact[],
  context: CalendarMatchingContext = { userExcludedNameParts: [] },
): CalendarEventMatch[] {
  const nowMs = Date.now()
  const matches: CalendarEventMatch[] = []

  for (const event of events) {
    if (shouldSkipCalendarEvent(event)) {
      continue
    }

    const timing = getCalendarEventTiming(event, nowMs)

    if (timing === "in_progress") {
      continue
    }

    let bestMatch: {
      contact: Contact
      score: ContactEventMatchScore
    } | null = null

    for (const contact of contacts) {
      if (!shouldTrackCalendarForContact(contact)) {
        continue
      }

      const score = scoreContactEventMatch(contact, event, context)

      if (!score) continue

      if (!bestMatch || score.confidence > bestMatch.score.confidence) {
        bestMatch = { contact, score }
      }
    }

    if (!bestMatch) {
      continue
    }

    const hoursFromNow =
      timing === "upcoming"
        ? Math.floor((getEventInstantMs(event.start) - nowMs) / (1000 * 60 * 60))
        : Math.floor((nowMs - getEventInstantMs(event.end)) / (1000 * 60 * 60))
    const action = getCalendarMatchAction(bestMatch.contact, timing)

    matches.push({
      event,
      contact: bestMatch.contact,
      timing,
      hoursFromNow,
      action,
      confidence: bestMatch.score.confidence,
      confidenceLabel: getConfidenceLabel(bestMatch.score.confidence),
      signal: bestMatch.score.signal,
    })
  }

  return matches.sort((left, right) => {
    if (left.timing !== right.timing) {
      return left.timing === "upcoming" ? -1 : 1
    }

    if (left.timing === "upcoming") {
      return getEventInstantMs(left.event.start) - getEventInstantMs(right.event.start)
    }

    return getEventInstantMs(right.event.end) - getEventInstantMs(left.event.end)
  })
}

export function shouldOpenPostCallModalAfterCalendarConfirm(
  match: CalendarEventMatch,
): boolean {
  if (match.timing !== "past") return false

  if (match.action.type === "log_only") return true

  return (
    match.action.type === "move_stage" && match.action.targetStage === "met_connected"
  )
}

export function formatCalendarMatchBannerText(match: CalendarEventMatch): string {
  const prompt = match.action.prompt
  const confidencePrefix = match.confidenceLabel ? `${match.confidenceLabel} · ` : ""

  if (match.timing === "upcoming") {
    const timeLabel = formatCalendarEventStartTime(match.event.start)
    return `${confidencePrefix}${match.contact.name} · ${match.event.title} at ${timeLabel} · ${prompt}`
  }

  const endedLabel = formatPastCallEndedLabel(match.event.end)
  return `${confidencePrefix}${match.contact.name} · ${match.event.title} ${endedLabel} · ${prompt}`
}
