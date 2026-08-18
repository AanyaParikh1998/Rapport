import type { Contact } from "@/lib/data"

export type SharedConnectionMatch = {
  contactId: string
  contactName: string
  type: "company" | "school"
  label: string
}

export type SharedConnectionPerson = {
  contactId: string
  contactName: string
}

export type SharedConnectionGroup = {
  type: "company" | "school"
  label: string
  people: SharedConnectionPerson[]
}

export function normalizeMatchField(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function getNormalizedSchools(contact: Contact): { normalized: string; label: string }[] {
  const schools: { normalized: string; label: string }[] = []
  const seen = new Set<string>()

  for (const school of [contact.undergraduateUniversity, contact.graduateUniversity]) {
    const trimmed = (school ?? "").trim()
    const normalized = normalizeMatchField(trimmed)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    schools.push({ normalized, label: trimmed })
  }

  return schools
}

function isSameSchool(a: string, b: string): boolean {
  if (a === b) return true

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a]
  if (!shorter || !longer.startsWith(shorter)) return false

  // Only treat the extra text as "same school, more detail" if it's a
  // comma-separated suffix (e.g. "..., berkeley" + ", haas school of
  // business") — not an unrelated word tacked on directly
  // (e.g. "berkeley" + " extension").
  return longer[shorter.length] === ","
}

export function getSharedSchoolLabels(a: Contact, b: Contact): string[] {
  const aSchools = getNormalizedSchools(a)
  const bSchools = getNormalizedSchools(b)
  const shared: string[] = []

  for (const aSchool of aSchools) {
    const hasMatch = bSchools.some((bSchool) => isSameSchool(aSchool.normalized, bSchool.normalized))
    if (hasMatch) {
      shared.push(aSchool.label)
    }
  }

  return shared
}

export function hasSharedSchool(a: Contact, b: Contact): boolean {
  return getSharedSchoolLabels(a, b).length > 0
}

export function groupSharedConnections(
  matches: SharedConnectionMatch[],
): SharedConnectionGroup[] {
  const groups = new Map<string, SharedConnectionGroup>()

  for (const match of matches) {
    const key = `${match.type}::${normalizeMatchField(match.label)}`
    const existing = groups.get(key)

    if (existing) {
      if (!existing.people.some((person) => person.contactId === match.contactId)) {
        existing.people.push({
          contactId: match.contactId,
          contactName: match.contactName,
        })
      }
      continue
    }

    groups.set(key, {
      type: match.type,
      label: match.label,
      people: [{ contactId: match.contactId, contactName: match.contactName }],
    })
  }

  return Array.from(groups.values())
}

export function getSharedConnectionSuffix(group: SharedConnectionGroup): string {
  const plural = group.people.length > 1

  switch (group.type) {
    case "company":
      return plural ? ` also work at ${group.label}` : ` also works at ${group.label}`
    case "school":
      return ` also went to ${group.label}`
  }
}

export function findSharedConnections(
  contact: Contact,
  contacts: Contact[],
): SharedConnectionMatch[] {
  const matches: SharedConnectionMatch[] = []
  const companyNorm = normalizeMatchField(contact.company)

  for (const other of contacts) {
    if (other.id === contact.id) continue

    if (companyNorm && normalizeMatchField(other.company) === companyNorm) {
      matches.push({
        contactId: other.id,
        contactName: other.name,
        type: "company",
        label: contact.company.trim(),
      })
    }

    for (const schoolLabel of getSharedSchoolLabels(contact, other)) {
      matches.push({
        contactId: other.id,
        contactName: other.name,
        type: "school",
        label: schoolLabel,
      })
    }
  }

  return matches
}
