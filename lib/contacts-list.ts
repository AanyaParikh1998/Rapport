import type { Contact, Stage } from "@/lib/data"
import { getContactCity } from "@/lib/cities"
import { getFirstName } from "@/lib/initials"

export type StatusFilter = "all" | Stage

export type ContactListFilters = {
  query: string
  status: StatusFilter
  university: string
  city: string
}

export const DEFAULT_CONTACT_LIST_FILTERS: ContactListFilters = {
  query: "",
  status: "all",
  university: "all",
  city: "all",
}

const RECENT_ACTIVITY_DAYS = 7

function daysSince(date: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)),
  )
}

export function getContactActivityDate(contact: Contact): string | null {
  return contact.lastActionAt ?? contact.createdAt ?? null
}

export function isRecentlyActiveContact(contact: Contact): boolean {
  const activityDate = getContactActivityDate(contact)
  if (!activityDate) return false
  return daysSince(activityDate) <= RECENT_ACTIVITY_DAYS
}

export function formatContactUpdatedLabel(contact: Contact): string {
  const activityDate = getContactActivityDate(contact)
  if (!activityDate) return "Updated recently"

  const days = daysSince(activityDate)
  if (days === 0) return "Updated today"
  if (days === 1) return "Updated 1d ago"
  return `Updated ${days}d ago`
}

export function getUniqueCities(contacts: Contact[]): string[] {
  const seen = new Map<string, string>()

  for (const contact of contacts) {
    const city = getContactCity(contact)
    if (!city) continue

    const key = city.toLowerCase()
    if (!seen.has(key)) {
      seen.set(key, city)
    }
  }

  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  )
}

function contactMatchesCity(contact: Contact, city: string): boolean {
  return getContactCity(contact).toLowerCase() === city.toLowerCase()
}

export function getUniqueUniversities(contacts: Contact[]): string[] {
  const seen = new Map<string, string>()

  for (const contact of contacts) {
    for (const value of [contact.undergraduateUniversity, contact.graduateUniversity]) {
      const trimmed = value?.trim()
      if (!trimmed) continue

      const key = trimmed.toLowerCase()
      if (!seen.has(key)) {
        seen.set(key, trimmed)
      }
    }
  }

  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  )
}

function contactMatchesUniversity(contact: Contact, university: string): boolean {
  const target = university.toLowerCase()
  const undergraduate = contact.undergraduateUniversity?.trim().toLowerCase()
  const graduate = contact.graduateUniversity?.trim().toLowerCase()

  return undergraduate === target || graduate === target
}

export function hasActiveContactListFilters(filters: ContactListFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.status !== "all" ||
    filters.university !== "all" ||
    filters.city !== "all"
  )
}

export function filterAndSortContacts(
  contacts: Contact[],
  filters: ContactListFilters,
): Contact[] {
  const query = filters.query.trim().toLowerCase()

  const filtered = contacts.filter((contact) => {
    if (query) {
      const matchesQuery =
        contact.name.toLowerCase().includes(query) ||
        contact.company.toLowerCase().includes(query) ||
        (contact.email?.toLowerCase().includes(query) ?? false) ||
        (contact.undergraduateUniversity?.toLowerCase().includes(query) ?? false) ||
        (contact.graduateUniversity?.toLowerCase().includes(query) ?? false)
      if (!matchesQuery) return false
    }

    if (filters.status !== "all" && contact.stage !== filters.status) {
      return false
    }

    if (
      filters.university !== "all" &&
      !contactMatchesUniversity(contact, filters.university)
    ) {
      return false
    }

    if (filters.city !== "all" && !contactMatchesCity(contact, filters.city)) {
      return false
    }

    return true
  })

  return filtered.sort((a, b) =>
    getFirstName(a.name).localeCompare(getFirstName(b.name), undefined, {
      sensitivity: "base",
    }),
  )
}
