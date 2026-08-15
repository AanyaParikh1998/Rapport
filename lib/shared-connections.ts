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

function getNormalizedSchoolLabels(contact: Contact): Map<string, string> {
  const schools = new Map<string, string>()

  for (const school of [contact.undergraduateUniversity, contact.graduateUniversity]) {
    const trimmed = (school ?? "").trim()
    const normalized = normalizeMatchField(trimmed)
    if (!normalized) continue
    if (!schools.has(normalized)) schools.set(normalized, trimmed)
  }

  return schools
}

export function getSharedSchoolLabels(a: Contact, b: Contact): string[] {
  const aSchools = getNormalizedSchoolLabels(a)
  const bSchools = getNormalizedSchoolLabels(b)
  const shared: string[] = []

  for (const [normalized, label] of aSchools) {
    if (bSchools.has(normalized)) {
      shared.push(label)
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
