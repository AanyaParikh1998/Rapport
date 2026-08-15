import type { Contact } from "@/lib/data"
import { calculateRelationshipScore } from "@/lib/relationship-score"
import {
  getSharedSchoolLabels,
  normalizeMatchField,
} from "@/lib/shared-connections"
import { isSuccessfulOutreachStage } from "@/lib/stages"

export type PotentialIntroducer = {
  contact: Contact
  reason: string
  score: number
}

function getIntroducerReason(target: Contact, introducer: Contact): string | null {
  const companyNorm = normalizeMatchField(target.company)
  if (companyNorm && normalizeMatchField(introducer.company) === companyNorm) {
    return `Both at ${target.company.trim()}`
  }

  const sharedSchools = getSharedSchoolLabels(target, introducer)
  if (sharedSchools.length > 0) {
    return `Both at ${sharedSchools[0]}`
  }

  return null
}

export function findPotentialIntroducers(
  target: Contact,
  contacts: Contact[],
): PotentialIntroducer[] {
  const byId = new Map<string, PotentialIntroducer>()

  for (const other of contacts) {
    if (other.id === target.id) continue
    if (!isSuccessfulOutreachStage(other.stage)) continue

    const reason = getIntroducerReason(target, other)
    if (!reason) continue

    const score = calculateRelationshipScore(other, contacts)
    const existing = byId.get(other.id)

    if (!existing || score > existing.score) {
      byId.set(other.id, { contact: other, reason, score })
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.score - a.score)
}
