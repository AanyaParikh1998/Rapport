"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ContactDetail } from "@/components/contact-detail"
import { ContactsList, getContactListSubtitle } from "@/components/contacts-list"
import { fetchContacts } from "@/lib/contacts"
import { CONTACTS_CHANGED_EVENT, notifyContactsChanged } from "@/lib/contacts-events"
import {
  DEFAULT_CONTACT_LIST_FILTERS,
  isRecentlyActiveContact,
  type ContactListFilters,
} from "@/lib/contacts-list"
import type { Contact } from "@/lib/data"

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filters, setFilters] = useState<ContactListFilters>(DEFAULT_CONTACT_LIST_FILTERS)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draftRefreshKey, setDraftRefreshKey] = useState(0)

  useEffect(() => {
    if (loading) return
    notifyContactsChanged(contacts)
  }, [contacts, loading])

  useEffect(() => {
    let cancelled = false

    async function loadContacts() {
      try {
        const data = await fetchContacts()
        if (!cancelled) {
          setContacts(data)
          setLoadError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load contacts")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadContacts()

    function handleContactsChanged(event: Event) {
      const nextContacts = (event as CustomEvent<Contact[]>).detail
      if (Array.isArray(nextContacts)) {
        setContacts(nextContacts)
      }
    }

    window.addEventListener(CONTACTS_CHANGED_EVENT, handleContactsChanged)

    return () => {
      cancelled = true
      window.removeEventListener(CONTACTS_CHANGED_EVENT, handleContactsChanged)
    }
  }, [])

  const selected = contacts.find((contact) => contact.id === selectedId) ?? null

  function handleContactUpdated(updated: Contact) {
    setContacts((current) =>
      current.map((contact) => (contact.id === updated.id ? updated : contact)),
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <div>
            <h1 className="text-sm font-semibold text-foreground">Contacts</h1>
            <p className="text-[11px] text-muted-foreground">
              {getContactListSubtitle(contacts.length, loading)}
            </p>
          </div>
          {contacts.some(isRecentlyActiveContact) ? (
            <p className="text-[11px] text-muted-foreground">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#378ADD]" />
              Recently active
            </p>
          ) : null}
        </header>

        {loadError ? (
          <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-[12px] text-destructive">
            {loadError}
          </div>
        ) : null}

        <ContactsList
          contacts={contacts}
          selectedId={selectedId}
          filters={filters}
          onFiltersChange={setFilters}
          onSelect={setSelectedId}
        />
      </main>

      <ContactDetail
        contact={selected}
        contacts={contacts}
        draftRefreshKey={draftRefreshKey}
        onSelectContact={(id) => {
          setSelectedId(id)
          setDraftRefreshKey((current) => current + 1)
        }}
        onContactUpdated={handleContactUpdated}
      />
    </div>
  )
}
