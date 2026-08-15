import type { Contact } from "@/lib/data"
import { getFirstName, getInitials } from "@/lib/initials"
import { calculateRelationshipScore } from "@/lib/relationship-score"
import { getSharedSchoolLabels, normalizeMatchField } from "@/lib/shared-connections"

export type NetworkNode = {
  id: string
  name: string
  firstName: string
  initials: string
  radius: number
  color: string
  score: number
}

export type NetworkLink = {
  source: string
  target: string
  strokeWidth: number
  tooltip: string
}

export function connectionTypeColor(connectionType: string): string {
  const normalized = connectionType.trim().toLowerCase()

  switch (normalized) {
    case "hot":
      return "#EF9F27"
    case "warm":
      return "#639922"
    case "cold":
      return "#888780"
    default:
      return "#888780"
  }
}

function scoreRadius(score: number): number {
  if (score >= 71) return 36
  if (score >= 41) return 28
  return 20
}

function getEdgeBetween(a: Contact, b: Contact): NetworkLink | null {
  const sharesCompany =
    Boolean(normalizeMatchField(a.company)) &&
    normalizeMatchField(a.company) === normalizeMatchField(b.company)

  const sharedSchools = getSharedSchoolLabels(a, b)
  const sharesUniversity = sharedSchools.length > 0

  if (!sharesCompany && !sharesUniversity) return null

  const strokeWidth =
    sharesCompany && sharesUniversity ? 3 : sharesCompany ? 2.5 : 1.5

  const tooltipParts: string[] = []
  if (sharesCompany) tooltipParts.push(`Both at ${a.company.trim()}`)
  if (sharesUniversity) {
    if (sharedSchools.length === 1) {
      tooltipParts.push(`Both went to ${sharedSchools[0]}`)
    } else {
      tooltipParts.push(`Both went to ${sharedSchools.join(", ")}`)
    }
  }

  return {
    source: a.id,
    target: b.id,
    strokeWidth,
    tooltip: tooltipParts.join(" · "),
  }
}

export function buildNetworkGraph(contacts: Contact[]) {
  const nodes: NetworkNode[] = contacts.map((contact) => {
    const score = calculateRelationshipScore(contact, contacts)

    return {
      id: contact.id,
      name: contact.name,
      firstName: getFirstName(contact.name),
      initials: getInitials(contact.name),
      radius: scoreRadius(score),
      color: connectionTypeColor(contact.connectionType),
      score,
    }
  })

  const links: NetworkLink[] = []

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const edge = getEdgeBetween(contacts[i], contacts[j])
      if (edge) links.push(edge)
    }
  }

  return { nodes, links }
}

export function buildNeighborMap(links: NetworkLink[]): Map<string, Set<string>> {
  const neighbors = new Map<string, Set<string>>()

  function addNeighbor(a: string, b: string) {
    if (!neighbors.has(a)) neighbors.set(a, new Set())
    neighbors.get(a)!.add(b)
  }

  for (const link of links) {
    addNeighbor(link.source, link.target)
    addNeighbor(link.target, link.source)
  }

  return neighbors
}

export function filterContactsByNameSearch(
  query: string,
  contacts: Contact[],
  limit = 6,
): Contact[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []

  return contacts
    .filter((contact) => contact.name.toLowerCase().includes(normalizedQuery))
    .slice(0, limit)
}

export function findContactIdBySearch(query: string, contacts: Contact[]): string | null {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return null

  const exact = contacts.find((contact) => contact.name.trim().toLowerCase() === normalizedQuery)
  if (exact) return exact.id

  const firstNameMatch = contacts.find((contact) =>
    getFirstName(contact.name).toLowerCase().startsWith(normalizedQuery),
  )
  if (firstNameMatch) return firstNameMatch.id

  const partial = contacts.find((contact) =>
    contact.name.toLowerCase().includes(normalizedQuery),
  )
  return partial?.id ?? null
}
