import type { Contact } from "@/lib/data"
import { getContactCity } from "@/lib/cities"
import { formatLinkedInHref } from "@/lib/linkedin-url"

function escapeValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
}

function splitName(name: string): { family: string; given: string; additional: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { family: "", given: "", additional: "" }
  if (parts.length === 1) return { family: "", given: parts[0], additional: "" }

  return {
    family: parts[parts.length - 1],
    given: parts[0],
    additional: parts.slice(1, -1).join(" "),
  }
}

export function buildVCard(contact: Contact): string {
  const { family, given, additional } = splitName(contact.name)
  const city = getContactCity(contact)
  const linkedinHref = formatLinkedInHref(contact.linkedinUrl ?? "")
  const email = contact.email?.trim() ?? ""

  const noteParts = [
    contact.goal?.trim() ? `Goal: ${contact.goal.trim()}` : "",
    contact.connectionType?.trim() ? `Connection: ${contact.connectionType.trim()}` : "",
    contact.source?.trim() ? `Source: ${contact.source.trim()}` : "",
    contact.notes?.trim(),
  ].filter(Boolean)

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeValue(family)};${escapeValue(given)};${escapeValue(additional)};;`,
    `FN:${escapeValue(contact.name)}`,
  ]

  if (contact.company?.trim()) lines.push(`ORG:${escapeValue(contact.company.trim())}`)
  if (contact.role?.trim()) lines.push(`TITLE:${escapeValue(contact.role.trim())}`)
  if (email) lines.push(`EMAIL;TYPE=INTERNET,WORK:${escapeValue(email)}`)
  if (city) lines.push(`ADR;TYPE=WORK:;;;${escapeValue(city)};;;`)
  if (linkedinHref) lines.push(`URL:${escapeValue(linkedinHref)}`)
  if (noteParts.length > 0) lines.push(`NOTE:${escapeValue(noteParts.join("\n"))}`)

  lines.push("END:VCARD")

  return `${lines.join("\r\n")}\r\n`
}

export function getVCardFileName(contact: Contact): string {
  const base = contact.name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")
  return `${base.toLowerCase() || "contact"}.vcf`
}

export function downloadVCard(contact: Contact): void {
  const blob = new Blob([buildVCard(contact)], { type: "text/vcard;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = getVCardFileName(contact)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
