export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}
