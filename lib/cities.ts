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
