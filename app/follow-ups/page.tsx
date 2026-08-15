"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { DraftOutreachModal } from "@/components/draft-outreach-modal"
import { FollowUpsKanban } from "@/components/follow-ups-kanban"
import { fetchContacts } from "@/lib/contacts"
import { CONTACTS_CHANGED_EVENT, notifyContactsChanged } from "@/lib/contacts-events"
import type { DraftOutreachFormat } from "@/lib/draft-outreach-context"
import type { Contact } from "@/lib/data"
import { getFollowUpItems, getFollowUpSections } from "@/lib/follow-ups"
import { fetchInteractionsByContactIds } from "@/lib/interactions"
import type { ContactInteraction } from "@/lib/interactions"
import { INTERACTIONS_CHANGED_EVENT } from "@/lib/interactions-events"
import {
  fetchDraftSummariesByContactIds,
  isFollowUpOutreachDraft,
  type ContactDraftSummary,
} from "@/lib/outreach-drafts"
import { hasManualFollowUpInteraction } from "@/lib/interactions"

type DraftModalState = {
  contact: Contact
  initialFormat: DraftOutreachFormat | null
}

export default function FollowUpsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [draftSummaries, setDraftSummaries] = useState<Map<string, ContactDraftSummary>>(
    new Map(),
  )
  const [interactionMap, setInteractionMap] = useState<Map<string, ContactInteraction[]>>(
    new Map(),
  )
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draftModal, setDraftModal] = useState<DraftModalState | null>(null)

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

  const followUpSections = useMemo(() => getFollowUpSections(contacts), [contacts])
  const followUpItems = useMemo(() => getFollowUpItems(contacts), [contacts])
  const count = followUpItems.length

  useEffect(() => {
    const contactIds = followUpItems.map((item) => item.contact.id)

    if (contactIds.length === 0) {
      setDraftSummaries(new Map())
      setInteractionMap(new Map())
      return
    }

    let cancelled = false

    Promise.all([
      fetchDraftSummariesByContactIds(contactIds),
      fetchInteractionsByContactIds(contactIds),
    ])
      .then(([summaries, interactions]) => {
        if (!cancelled) {
          setDraftSummaries(summaries)
          setInteractionMap(interactions)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDraftSummaries(new Map())
          setInteractionMap(new Map())
        }
      })

    return () => {
      cancelled = true
    }
  }, [followUpItems])

  useEffect(() => {
    function handleInteractionsChanged() {
      const contactIds = followUpItems.map((item) => item.contact.id)
      if (contactIds.length === 0) return

      fetchInteractionsByContactIds(contactIds)
        .then(setInteractionMap)
        .catch(() => setInteractionMap(new Map()))
    }

    window.addEventListener(INTERACTIONS_CHANGED_EVENT, handleInteractionsChanged)
    return () => {
      window.removeEventListener(INTERACTIONS_CHANGED_EVENT, handleInteractionsChanged)
    }
  }, [followUpItems])

  useEffect(() => {
    if (loading) return
    notifyContactsChanged(contacts)
  }, [contacts, loading])

  function handleContactUpdated(updated: Contact) {
    setContacts((current) =>
      current.map((contact) => (contact.id === updated.id ? updated : contact)),
    )
  }

  function openDraftModal(contact: Contact, initialFormat?: DraftOutreachFormat) {
    setDraftModal({
      contact,
      initialFormat: initialFormat ?? null,
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-border px-5">
          <div>
            <h1 className="text-sm font-semibold text-foreground">Follow-ups</h1>
            <p className="text-[11px] text-muted-foreground">
              {loading
                ? "Loading contacts..."
                : count === 1
                  ? "1 contact needs attention"
                  : `${count} contacts need attention`}
            </p>
          </div>
        </header>

        {loadError ? (
          <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-[12px] text-destructive">
            {loadError}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
              Loading follow-ups...
            </div>
          ) : count === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-5 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/50" strokeWidth={1.5} />
              <p className="text-[13px] font-medium text-foreground">You are all caught up</p>
            </div>
          ) : (
            <FollowUpsKanban
              sections={followUpSections}
              draftSummaries={draftSummaries}
              interactionMap={interactionMap}
              onDraftOpen={openDraftModal}
              onNoteSaved={handleContactUpdated}
            />
          )}
        </div>
      </main>

      {draftModal ? (
        <DraftOutreachModal
          open={Boolean(draftModal)}
          contact={draftModal.contact}
          contacts={contacts}
          existingDraft={null}
          initialFormat={draftModal.initialFormat}
          fromFollowUpsPage
          followUpMode={isFollowUpOutreachDraft({
            stage: draftModal.contact.stage,
            hasSentDraft: draftSummaries.get(draftModal.contact.id)?.hasSentDraft ?? false,
            hasManualFollowUpInteraction: hasManualFollowUpInteraction(
              interactionMap.get(draftModal.contact.id) ?? [],
            ),
            fromFollowUpsPage: true,
          })}
          onClose={() => setDraftModal(null)}
          onSaved={() => {
            setDraftModal(null)
            const contactIds = followUpItems.map((item) => item.contact.id)
            if (contactIds.length > 0) {
              Promise.all([
                fetchDraftSummariesByContactIds(contactIds),
                fetchInteractionsByContactIds(contactIds),
              ]).then(([summaries, interactions]) => {
                setDraftSummaries(summaries)
                setInteractionMap(interactions)
              })
            }
          }}
        />
      ) : null}
    </div>
  )
}
