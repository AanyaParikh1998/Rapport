"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { NetworkGraph } from "@/components/network-graph"
import { ContactDetail } from "@/components/contact-detail"
import { fetchContacts } from "@/lib/contacts"
import type { Contact } from "@/lib/data"

export default function NetworkPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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

    return () => {
      cancelled = true
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
        <header className="flex h-14 shrink-0 items-center border-b border-border px-5">
          <div>
            <h1 className="text-sm font-semibold text-foreground">Network</h1>
            <p className="text-[11px] text-muted-foreground">
              {loading
                ? "Loading contacts..."
                : `${contacts.length} contacts · drag nodes to explore connections`}
            </p>
          </div>
        </header>

        {loadError ? (
          <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-[12px] text-destructive">
            {loadError}
          </div>
        ) : null}

        <div className="min-h-0 flex-1">
          {loading ? (
            <div className="flex h-full items-center justify-center bg-white text-[13px] text-muted-foreground">
              Loading network...
            </div>
          ) : (
            <NetworkGraph
              contacts={contacts}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>
      </main>

      <ContactDetail
        contact={selected}
        contacts={contacts}
        onSelectContact={setSelectedId}
        onContactUpdated={handleContactUpdated}
      />
    </div>
  )
}
