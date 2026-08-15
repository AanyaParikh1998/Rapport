import type { Contact } from "@/lib/data"

export const CONTACTS_CHANGED_EVENT = "rapport:contacts-changed"

export function notifyContactsChanged(contacts: Contact[]) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<Contact[]>(CONTACTS_CHANGED_EVENT, { detail: contacts }),
  )
}
