import type { Contact } from "@/lib/data"
import { getUniqueUniversities } from "@/lib/contacts-list"

// A curated list of commonly-referenced schools, merged at call time with
// whatever university names already exist across the user's own contacts
// (see getUniversityOptions) — so the list is useful on day one and grows
// to reflect real usage without needing to be exhaustive up front.
export const COMMON_UNIVERSITIES = [
  "Amherst College",
  "Arizona State University",
  "Boston College",
  "Boston University",
  "Bowdoin College",
  "Brown University",
  "California Institute of Technology",
  "Carnegie Mellon University",
  "Case Western Reserve University",
  "Colby College",
  "Colgate University",
  "Columbia University",
  "Cornell University",
  "Dartmouth College",
  "Duke University",
  "Emory University",
  "Florida State University",
  "George Washington University",
  "Georgetown University",
  "Georgia Institute of Technology",
  "Harvard Business School",
  "Harvard University",
  "Indiana University Bloomington",
  "Johns Hopkins University",
  "Massachusetts Institute of Technology",
  "Michigan State University",
  "Middlebury College",
  "New York University",
  "North Carolina State University",
  "Northwestern University",
  "Notre Dame",
  "Ohio State University",
  "Pomona College",
  "Princeton University",
  "Purdue University",
  "Rice University",
  "Stanford Graduate School of Business",
  "Stanford University",
  "Swarthmore College",
  "Texas A&M University",
  "The Wharton School",
  "Tufts University",
  "Tulane University",
  "University of California, Berkeley",
  "University of California, Davis",
  "University of California, Irvine",
  "University of California, Los Angeles",
  "University of California, San Diego",
  "University of California, Santa Barbara",
  "University of Chicago",
  "University of Colorado Boulder",
  "University of Florida",
  "University of Georgia",
  "University of Illinois Urbana-Champaign",
  "University of Maryland",
  "University of Michigan",
  "University of Minnesota",
  "University of North Carolina at Chapel Hill",
  "University of Notre Dame",
  "University of Pennsylvania",
  "University of Pittsburgh",
  "University of Southern California",
  "University of Texas at Austin",
  "University of Virginia",
  "University of Washington",
  "University of Wisconsin-Madison",
  "Vanderbilt University",
  "Villanova University",
  "Wake Forest University",
  "Washington University in St. Louis",
  "Wellesley College",
  "Wesleyan University",
  "Williams College",
  "Yale University",
] as const

export function getUniversityOptions(contacts: Contact[]): string[] {
  const seen = new Map<string, string>()

  for (const name of [...COMMON_UNIVERSITIES, ...getUniqueUniversities(contacts)]) {
    const key = name.toLowerCase()
    if (!seen.has(key)) {
      seen.set(key, name)
    }
  }

  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  )
}
