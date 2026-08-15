import type { Contact } from "@/lib/data"
import { getStageScorePoints } from "@/lib/stages"
import { hasSharedSchool, normalizeMatchField } from "@/lib/shared-connections"

function scoreConnectionType(connectionType: string): number {
  switch (connectionType) {
    case "Hot":
      return 30
    case "Warm":
      return 20
    case "Cold":
      return 5
    default:
      return 0
  }
}

function scoreMutualCount(mutualCount: number | null | undefined): number {
  const count = mutualCount ?? 0

  if (count >= 50) return 25
  if (count >= 20) return 15
  if (count >= 1) return 8
  return 0
}

function scoreLastAction(lastActionAt: string | null | undefined): number {
  if (!lastActionAt) return 0

  const daysSince = Math.max(
    0,
    Math.floor((Date.now() - new Date(lastActionAt).getTime()) / (1000 * 60 * 60 * 24)),
  )

  if (daysSince <= 7) return 10
  if (daysSince <= 30) return 5
  return 0
}

function scoreSharedConnectionTier(connectionType: string, matchCount: number): number {
  if (matchCount === 0) return 0

  switch (connectionType) {
    case "Hot":
      return matchCount >= 2 ? 20 : 15
    case "Warm":
      return matchCount >= 2 ? 13 : 10
    case "Cold":
      return matchCount >= 2 ? 5 : 3
    default:
      return 0
  }
}

function scoreSharedConnections(contact: Contact, contacts: Contact[]): number {
  const companyNorm = normalizeMatchField(contact.company)
  const matchCounts: Record<string, number> = { Hot: 0, Warm: 0, Cold: 0 }
  const seenContactIds = new Set<string>()

  for (const other of contacts) {
    if (other.id === contact.id || seenContactIds.has(other.id)) continue

    const sharesCompany = companyNorm && normalizeMatchField(other.company) === companyNorm
    const sharesUniversity = hasSharedSchool(contact, other)

    if (!sharesCompany && !sharesUniversity) continue

    seenContactIds.add(other.id)

    if (other.connectionType in matchCounts) {
      matchCounts[other.connectionType]++
    }
  }

  return (
    scoreSharedConnectionTier("Hot", matchCounts.Hot) +
    scoreSharedConnectionTier("Warm", matchCounts.Warm) +
    scoreSharedConnectionTier("Cold", matchCounts.Cold)
  )
}

export function calculateRelationshipScore(contact: Contact, contacts: Contact[]): number {
  const score =
    scoreConnectionType(contact.connectionType) +
    scoreMutualCount(contact.mutualCount) +
    getStageScorePoints(contact.stage) +
    scoreLastAction(contact.lastActionAt) +
    scoreSharedConnections(contact, contacts)

  return Math.min(100, score)
}
