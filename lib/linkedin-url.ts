export function formatLinkedInHref(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ""

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }

  return `https://${trimmed}`
}
