export const INTERACTIONS_CHANGED_EVENT = "rapport:interactions-changed"

export function notifyInteractionsChanged(contactId: string) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<string>(INTERACTIONS_CHANGED_EVENT, { detail: contactId }),
  )
}
