import type { Contact } from "@/lib/data"
import { getContactCity } from "@/lib/cities"

export const GLOBAL_SEARCH_RESULT_LIMIT = 8

type SearchMatchTier = 0 | 1 | 2 | 3

function getMatchTier(contact: Contact, query: string): SearchMatchTier | null {
  const q = query.toLowerCase().trim()
  if (!q) return null

  const name = contact.name.toLowerCase()
  const company = contact.company.toLowerCase()
  const role = contact.role.toLowerCase()
  const city = getContactCity(contact).toLowerCase()

  if (name.includes(q)) return 0
  if (company.includes(q)) return 1
  if (role.includes(q)) return 2
  if (city.includes(q)) return 3

  return null
}

export function searchContacts(contacts: Contact[], query: string): Contact[] {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  return contacts
    .map((contact) => ({ contact, tier: getMatchTier(contact, trimmedQuery) }))
    .filter((item): item is { contact: Contact; tier: SearchMatchTier } => item.tier !== null)
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier
      return a.contact.name.localeCompare(b.contact.name, undefined, { sensitivity: "base" })
    })
    .slice(0, GLOBAL_SEARCH_RESULT_LIMIT)
    .map((item) => item.contact)
}
