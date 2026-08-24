import type { Contact } from "@/lib/data"

export function normalizeCityName(value: string | null | undefined): string {
  if (!value?.trim()) return ""

  const trimmed = value.trim()
  const cityOnly = trimmed.split(",")[0]?.trim() ?? trimmed
  return cityOnly
}

export function getContactCity(contact: {
  city?: string
}): string {
  return normalizeCityName(contact.city)
}

// The top 100 US cities by population, plus a handful of major international
// hubs. Merged at call time with whatever city names already exist across
// the user's own contacts (see getCityOptions) — same pattern as
// getUniversityOptions in lib/universities.ts — so the list is useful on day
// one and grows to reflect real usage without needing to be exhaustive.
export const COMMON_CITIES = [
  "Albuquerque",
  "Anaheim",
  "Anchorage",
  "Arlington",
  "Atlanta",
  "Aurora",
  "Austin",
  "Bakersfield",
  "Baltimore",
  "Bangalore",
  "Baton Rouge",
  "Boise",
  "Boston",
  "Buffalo",
  "Chandler",
  "Charlotte",
  "Chesapeake",
  "Chicago",
  "Chula Vista",
  "Cincinnati",
  "Cleveland",
  "Colorado Springs",
  "Columbus",
  "Corpus Christi",
  "Dallas",
  "Delhi",
  "Denver",
  "Detroit",
  "Dubai",
  "Durham",
  "El Paso",
  "Fort Wayne",
  "Fort Worth",
  "Fremont",
  "Fresno",
  "Garland",
  "Gilbert",
  "Glendale",
  "Greensboro",
  "Henderson",
  "Hialeah",
  "Hong Kong",
  "Honolulu",
  "Houston",
  "Indianapolis",
  "Irvine",
  "Irving",
  "Jacksonville",
  "Jersey City",
  "Kansas City",
  "Laredo",
  "Las Vegas",
  "Lexington",
  "Lincoln",
  "London",
  "Long Beach",
  "Los Angeles",
  "Louisville",
  "Lubbock",
  "Madison",
  "Memphis",
  "Mesa",
  "Miami",
  "Milwaukee",
  "Minneapolis",
  "Mumbai",
  "Nashville",
  "New Orleans",
  "New York",
  "Newark",
  "Norfolk",
  "North Las Vegas",
  "Oakland",
  "Oklahoma City",
  "Omaha",
  "Orlando",
  "Philadelphia",
  "Phoenix",
  "Pittsburgh",
  "Plano",
  "Portland",
  "Raleigh",
  "Reno",
  "Richmond",
  "Riverside",
  "Sacramento",
  "Saint Paul",
  "Salt Lake City",
  "San Antonio",
  "San Bernardino",
  "San Diego",
  "San Francisco",
  "San Jose",
  "Santa Ana",
  "Scottsdale",
  "Seattle",
  "Singapore",
  "Spokane",
  "St. Louis",
  "St. Petersburg",
  "Stockton",
  "Tacoma",
  "Tampa",
  "Toledo",
  "Toronto",
  "Tucson",
  "Tulsa",
  "Virginia Beach",
  "Washington",
  "Wichita",
  "Winston-Salem",
] as const

export function getCityOptions(contacts: Contact[]): string[] {
  const seen = new Map<string, string>()

  // Computed inline (rather than via lib/contacts-list.ts's getUniqueCities,
  // which does the same dedup) to avoid a circular import — contacts-list.ts
  // already imports getContactCity from this file.
  const contactCities = contacts
    .map((contact) => getContactCity(contact))
    .filter((city): city is string => Boolean(city))

  for (const name of [...COMMON_CITIES, ...contactCities]) {
    const key = name.toLowerCase()
    if (!seen.has(key)) {
      seen.set(key, name)
    }
  }

  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  )
}
