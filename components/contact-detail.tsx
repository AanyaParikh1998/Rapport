"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  Calendar,
  Info,
  Mail,
  Target,
  Link2,
  Compass,
  Users,
  ExternalLink,
  Building2,
  GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Contact } from "@/lib/data"
import { getContactCity } from "@/lib/cities"
import { formatLinkedInHref } from "@/lib/linkedin-url"
import { calculateRelationshipScore } from "@/lib/relationship-score"
import {
  findSharedConnections,
  groupSharedConnections,
  getSharedConnectionSuffix,
  type SharedConnectionPerson,
} from "@/lib/shared-connections"
import {
  deleteOutreachDraft,
  fetchOutreachDraftsByContactId,
  getOutreachDraftButtonLabel,
  hasSentDraft,
  isFollowUpOutreachDraft,
  isDraftMarkedSuccessful,
  type OutreachDraft,
} from "@/lib/outreach-drafts"
import { DraftOutreachModal } from "@/components/draft-outreach-modal"
import { DraftIntroModal } from "@/components/draft-intro-modal"
import { PreCallPrepModal } from "@/components/pre-call-prep-modal"
import { ContactInteractions } from "@/components/contact-interactions"
import { SignalStrength } from "@/components/signal-strength"
import { Avatar } from "@/components/avatar"
import { TagPill } from "@/components/tag-pill"
import { findPotentialIntroducers, type PotentialIntroducer } from "@/lib/introducers"
import {
  AUTO_LOG_FOLLOW_UP_DRAFTED,
  fetchInteractionsByContactId,
  hasManualFollowUpInteraction,
  type ContactInteraction,
  type InteractionTimelineEntry,
} from "@/lib/interactions"
import { INTERACTIONS_CHANGED_EVENT } from "@/lib/interactions-events"
import type { PostCallDraftContext } from "@/lib/post-call-context"
import {
  applyLatestInteractionToContact,
  applyOptimisticLastActionTouch,
  fetchContactById,
  formatLastEmailedLabel,
  updateTrackCalendar,
} from "@/lib/contacts"
import { notifyContactsChanged } from "@/lib/contacts-events"
import { getTrackCalendarSuggestion } from "@/lib/track-calendar"

type DetailTab = "profile" | "outreach" | "notes_drafts"

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "outreach", label: "Outreach" },
  { id: "notes_drafts", label: "Notes & Drafts" },
]

export function ContactDetail({
  contact,
  contacts,
  draftRefreshKey,
  onSelectContact,
  calendarBannerContactIds,
  onContactUpdated,
}: {
  contact: Contact | null
  contacts: Contact[]
  draftRefreshKey?: number
  onSelectContact: (id: string) => void
  calendarBannerContactIds?: Set<string>
  onContactUpdated?: (contact: Contact) => void
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("profile")
  const [draftModalOpen, setDraftModalOpen] = useState(false)
  const [introModalOpen, setIntroModalOpen] = useState(false)
  const [selectedIntroducer, setSelectedIntroducer] = useState<PotentialIntroducer | null>(
    null,
  )
  const [editingDraft, setEditingDraft] = useState<OutreachDraft | null>(null)
  const [savedDrafts, setSavedDrafts] = useState<OutreachDraft[]>([])
  const [contactInteractions, setContactInteractions] = useState<ContactInteraction[]>([])
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null)
  const [postCallDraftContext, setPostCallDraftContext] = useState<PostCallDraftContext | null>(
    null,
  )
  const [prepSheetOpen, setPrepSheetOpen] = useState(false)
  const [highlightSummaryId, setHighlightSummaryId] = useState<string | null>(null)
  const [highlightDraftId, setHighlightDraftId] = useState<string | null>(null)

  useEffect(() => {
    setActiveTab("profile")
    setPrepSheetOpen(false)
    setHighlightSummaryId(null)
    setHighlightDraftId(null)
  }, [contact?.id])

  useEffect(() => {
    if (activeTab !== "notes_drafts") return

    const targetId = highlightSummaryId
      ? `summary-card-${highlightSummaryId}`
      : highlightDraftId
        ? `draft-card-${highlightDraftId}`
        : null

    if (!targetId) return

    const scrollTimer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 50)

    const clearTimer = window.setTimeout(() => {
      setHighlightSummaryId(null)
      setHighlightDraftId(null)
    }, 2500)

    return () => {
      clearTimeout(scrollTimer)
      clearTimeout(clearTimer)
    }
  }, [activeTab, highlightSummaryId, highlightDraftId])

  useEffect(() => {
    if (!contact) {
      setSavedDrafts([])
      setDraftsLoading(false)
      return
    }

    let cancelled = false
    setDraftsLoading(true)

    fetchOutreachDraftsByContactId(contact.id)
      .then((drafts) => {
        if (!cancelled) {
          setSavedDrafts(
            drafts.map((draft) => ({
              ...draft,
              wasSuccessful: isDraftMarkedSuccessful(draft, contact.stage),
            })),
          )
        }
      })
      .catch(() => {
        if (!cancelled) setSavedDrafts([])
      })
      .finally(() => {
        if (!cancelled) setDraftsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [contact?.id, contact?.stage])

  useEffect(() => {
    if (!contact) {
      setContactInteractions([])
      return
    }

    let cancelled = false

    fetchInteractionsByContactId(contact.id)
      .then((data) => {
        if (!cancelled) setContactInteractions(data)
      })
      .catch(() => {
        if (!cancelled) setContactInteractions([])
      })

    function handleInteractionContactUpdated(updated: Contact) {
      onContactUpdated?.(updated)
      notifyContactsChanged(
        contacts.map((item) => (item.id === updated.id ? updated : item)),
      )
    }

    function handleInteractionsChanged(event: Event) {
      const changedContactId = (event as CustomEvent<string>).detail
      if (!contact || changedContactId !== contact.id) return

      handleInteractionContactUpdated(applyOptimisticLastActionTouch(contact))

      fetchInteractionsByContactId(contact.id)
        .then((data) => {
          if (!cancelled) setContactInteractions(data)
        })
        .catch(() => {
          if (!cancelled) setContactInteractions([])
        })

      void fetchContactById(contact.id).then((updated) => {
        if (!cancelled && updated) {
          handleInteractionContactUpdated(updated)
        }
      })
    }

    window.addEventListener(INTERACTIONS_CHANGED_EVENT, handleInteractionsChanged)

    return () => {
      cancelled = true
      window.removeEventListener(INTERACTIONS_CHANGED_EVENT, handleInteractionsChanged)
    }
  }, [contact?.id])

  useEffect(() => {
    if (!contact || draftRefreshKey === 0) return

    let cancelled = false

    fetchOutreachDraftsByContactId(contact.id)
      .then((drafts) => {
        if (!cancelled) {
          setSavedDrafts(
            drafts.map((draft) => ({
              ...draft,
              wasSuccessful: isDraftMarkedSuccessful(draft, contact.stage),
            })),
          )
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [draftRefreshKey, contact?.id, contact?.stage])

  useEffect(() => {
    if (!contact) return

    setSavedDrafts((current) =>
      current.map((draft) => ({
        ...draft,
        wasSuccessful: isDraftMarkedSuccessful(draft, contact.stage),
      })),
    )
  }, [contact?.stage, contact?.id])

  if (!contact) {
    return (
      <aside className="flex w-[300px] shrink-0 flex-col items-center justify-center border-l border-border bg-card px-6 text-center">
        <p className="text-[13px] font-medium text-foreground">No contact selected</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Select a card from the pipeline to see details and draft outreach.
        </p>
      </aside>
    )
  }

  const linkedinHref = formatLinkedInHref(contact.linkedinUrl ?? "")
  const relationshipScore = calculateRelationshipScore(contact, contacts)
  const sharedConnectionGroups = groupSharedConnections(findSharedConnections(contact, contacts))
  const potentialIntroducers = findPotentialIntroducers(contact, contacts)
  const city = getContactCity(contact)
  const latestInteractionAt = contactInteractions[0]?.createdAt ?? null
  const contactForFollowUp = applyLatestInteractionToContact(contact, latestInteractionAt)
  const contactHasSentDraft = hasSentDraft(savedDrafts)
  const contactHasManualFollowUp = hasManualFollowUpInteraction(contactInteractions)
  const draftButtonLabel = getOutreachDraftButtonLabel({
    stage: contact.stage,
    hasSentDraft: contactHasSentDraft,
    hasManualFollowUpInteraction: contactHasManualFollowUp,
  })
  const followUpDraftMode = isFollowUpOutreachDraft({
    stage: contact.stage,
    hasSentDraft: contactHasSentDraft,
    hasManualFollowUpInteraction: contactHasManualFollowUp,
  })

  function handleSelectSharedContact(contactId: string) {
    onSelectContact(contactId)

    requestAnimationFrame(() => {
      document
        .getElementById(`contact-card-${contactId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }

  function openNewDraftModal() {
    setEditingDraft(null)
    setDraftModalOpen(true)
  }

  function openIntroModal(introducer: PotentialIntroducer) {
    setSelectedIntroducer(introducer)
    setIntroModalOpen(true)
  }

  function openDraftModal(draft: OutreachDraft) {
    setEditingDraft(draft)
    setDraftModalOpen(true)
  }

  function handleOpenPrepSheet() {
    setPrepSheetOpen(true)
  }

  function handlePrepContactUpdated(updated: Contact) {
    onContactUpdated?.(updated)
    notifyContactsChanged(
      contacts.map((item) => (item.id === updated.id ? updated : item)),
    )
  }

  function handlePostCallSaved() {
    if (!contact) return

    void fetchInteractionsByContactId(contact.id).then(setContactInteractions)
    setActiveTab("notes_drafts")
  }

  function navigateToSummary(interactionId: string) {
    setHighlightSummaryId(interactionId)
    setHighlightDraftId(null)
    setActiveTab("notes_drafts")
    window.location.hash = `notes_drafts-summary-${interactionId}`
  }

  function navigateToDraft(draftId: string) {
    setHighlightDraftId(draftId)
    setHighlightSummaryId(null)
    setActiveTab("notes_drafts")
    window.location.hash = `notes_drafts-draft-${draftId}`
  }

  function resolveDraftIdForTimelineEntry(entry: InteractionTimelineEntry): string | null {
    if (entry.draftId) return entry.draftId
    if (entry.notes !== AUTO_LOG_FOLLOW_UP_DRAFTED) return null

    const entryDay = new Date(entry.createdAt).toDateString()
    const sameDay = savedDrafts.find(
      (draft) => new Date(draft.createdAt).toDateString() === entryDay,
    )
    return sameDay?.id ?? savedDrafts[0]?.id ?? null
  }

  function handlePostCallDraftFollowUp(context: PostCallDraftContext) {
    setPostCallDraftContext(context)
    setEditingDraft(null)
    setDraftModalOpen(true)
  }

  function handleDraftSaved(draft: OutreachDraft) {
    setSavedDrafts((current) => {
      const existingIndex = current.findIndex((item) => item.id === draft.id)
      if (existingIndex === -1) return [draft, ...current]
      return current.map((item) => (item.id === draft.id ? draft : item))
    })
  }

  async function handleDeleteDraft(draftId: string) {
    setDeletingDraftId(draftId)
    try {
      await deleteOutreachDraft(draftId)
      setSavedDrafts((current) => current.filter((item) => item.id !== draftId))
    } finally {
      setDeletingDraftId(null)
    }
  }

  return (
    <>
      <aside className="flex w-[300px] shrink-0 flex-col overflow-hidden border-l border-border bg-card">
        <div className="shrink-0 px-5 pt-5">
          {contactForFollowUp.followUpOverdue && !calendarBannerContactIds?.has(contact.id) ? (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="text-[11px] font-semibold text-amber-800">Follow-up needed</p>
                <p className="mt-0.5 text-[11px] leading-snug text-amber-700">
                  {contactForFollowUp.followUpNote}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col items-center text-center">
            <Avatar name={contact.name} size="lg" />
            <h2 className="mt-3 text-[15px] font-semibold text-foreground">{contact.name}</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">{contact.role}</p>
            <p className="text-[12px] text-muted-foreground">{contact.company}</p>
            {city ? (
              <p className="mt-1 text-[12px] text-muted-foreground">{city}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex shrink-0 border-b border-border px-3">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 px-1 pb-2.5 pt-1 text-[11px] font-medium transition-colors",
                activeTab === tab.id
                  ? "border-b-2 border-[#378ADD] text-foreground"
                  : "text-muted-foreground hover:text-foreground/80",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "profile" ? (
            <div className="flex flex-col gap-4">
              <section>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Context
                </h3>
                <dl className="flex flex-col gap-3">
                  <ContextRow icon={Target} label="Goal" value={contact.goal} />
                  <ContextRow icon={Compass} label="Source" value={contact.source} />
                  <ContextRow icon={Link2} label="Connection" value={contact.connectionType} />
                  {contact.lastEmailedAt ? (
                    <ContextRow
                      icon={Mail}
                      label="Last emailed"
                      value={formatLastEmailedLabel(contact.lastEmailedAt)}
                    />
                  ) : null}
                  {contact.mutualCount && contact.mutualCount > 0 ? (
                    <ContextRow
                      icon={Users}
                      label="Mutual connections"
                      value={`${contact.mutualCount} mutual${contact.mutualCount === 1 ? "" : "s"}`}
                    />
                  ) : null}
                  {linkedinHref ? (
                    <div className="flex gap-2.5">
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          LinkedIn
                        </dt>
                        <dd className="mt-0.5">
                          <a
                            href={linkedinHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-[12px] leading-snug text-primary hover:underline"
                          >
                            {contact.linkedinUrl}
                          </a>
                        </dd>
                      </div>
                    </div>
                  ) : null}
                  {contact.email?.trim() ? (
                    <div className="flex gap-2.5">
                      <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Email
                        </dt>
                        <dd className="mt-0.5">
                          <a
                            href={`mailto:${contact.email.trim()}`}
                            className="break-all text-[12px] leading-snug text-primary hover:underline"
                          >
                            {contact.email.trim()}
                          </a>
                        </dd>
                      </div>
                    </div>
                  ) : null}
                  {formatUniversityDisplay(contact) ? (
                    <ContextRow
                      icon={GraduationCap}
                      label="University"
                      value={formatUniversityDisplay(contact)!}
                    />
                  ) : null}
                  <div className="flex gap-2.5">
                    <div className="mt-1 w-3.5 shrink-0" aria-hidden />
                    <div className="min-w-0">
                      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Relationship strength
                      </dt>
                      <dd className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-medium leading-snug text-foreground">
                        {relationshipScore}
                        <SignalStrength score={relationshipScore} />
                      </dd>
                    </div>
                  </div>
                  <TrackCalendarEventsRow
                    contact={contact}
                    onContactUpdated={onContactUpdated}
                  />
                </dl>
              </section>

              <section className="border-t border-border pt-4">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </h3>
                <p className="text-[12px] leading-relaxed text-foreground/80">
                  {contact.notes || "No notes yet."}
                </p>
              </section>

              {sharedConnectionGroups.length > 0 ? (
                <section className="border-t border-border pt-4">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Shared connections
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {sharedConnectionGroups.map((group) => (
                      <li
                        key={`${group.type}-${group.label}`}
                        className="flex items-start gap-2 rounded-md px-1 py-0.5"
                      >
                        {group.type === "company" ? (
                          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <p className="text-[12px] leading-snug text-foreground/80">
                          <SharedConnectionNames
                            people={group.people}
                            onSelect={handleSelectSharedContact}
                          />
                          {getSharedConnectionSuffix(group)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}

          {activeTab !== "profile" ? (
            <div className="flex flex-col gap-4">
              {activeTab === "outreach" ? (
                <>
                  <button
                    type="button"
                    onClick={openNewDraftModal}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Mail className="h-4 w-4" />
                    {draftButtonLabel}
                  </button>

                  {potentialIntroducers.length > 0 ? (
                    <section>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Request a warm intro
                      </h3>
                      <p className="mt-1 mb-3 text-[11px] text-muted-foreground">
                        These contacts might be able to introduce you
                      </p>
                      <ul className="flex flex-col gap-2.5">
                        {potentialIntroducers.map((introducer) => (
                          <li
                            key={introducer.contact.id}
                            className="rounded-md border border-border bg-background px-3 py-2.5"
                          >
                            <div className="flex items-start gap-2.5">
                              <Avatar name={introducer.contact.name} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[12px] font-medium text-foreground">
                                  {introducer.contact.name}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {introducer.contact.company}
                                </p>
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  {introducer.reason}
                                </p>
                                <div className="mt-1.5">
                                  {introducer.contact.tags[0] ? (
                                    <TagPill tag={introducer.contact.tags[0]} />
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openIntroModal(introducer)}
                              className="mt-2.5 w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/60"
                            >
                              Draft intro request
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </>
              ) : null}

              <ContactInteractions
                section={activeTab === "outreach" ? "outreach" : "notes_drafts"}
                contact={contact}
                contactId={contact.id}
                stage={contact.stage}
                postCallHandlers={{
                  onSaved: handlePostCallSaved,
                  onSaveAndDraftFollowUp: handlePostCallDraftFollowUp,
                }}
                onOpenPrepSheet={handleOpenPrepSheet}
                onNavigateToSummary={navigateToSummary}
                onNavigateToDraft={navigateToDraft}
                resolveDraftIdForEntry={resolveDraftIdForTimelineEntry}
                savedDrafts={savedDrafts}
                draftsLoading={draftsLoading}
                deletingDraftId={deletingDraftId}
                onOpenDraft={openDraftModal}
                onDeleteDraft={handleDeleteDraft}
                highlightSummaryId={highlightSummaryId}
                highlightDraftId={highlightDraftId}
              />
            </div>
          ) : null}
        </div>
      </aside>

      <DraftOutreachModal
        open={draftModalOpen}
        contact={contact}
        contacts={contacts}
        existingDraft={editingDraft}
        followUpMode={postCallDraftContext ? true : followUpDraftMode}
        postCallContext={postCallDraftContext}
        onClose={() => {
          setDraftModalOpen(false)
          setEditingDraft(null)
          setPostCallDraftContext(null)
        }}
        onSaved={handleDraftSaved}
      />

      {contact ? (
        <PreCallPrepModal
          open={prepSheetOpen}
          contact={contact}
          onClose={() => setPrepSheetOpen(false)}
          onContactUpdated={handlePrepContactUpdated}
        />
      ) : null}

      {selectedIntroducer ? (
        <DraftIntroModal
          open={introModalOpen}
          targetContact={contact}
          introducer={selectedIntroducer}
          onClose={() => {
            setIntroModalOpen(false)
            setSelectedIntroducer(null)
          }}
          onSaved={handleDraftSaved}
        />
      ) : null}
    </>
  )
}

function SharedConnectionNames({
  people,
  onSelect,
}: {
  people: SharedConnectionPerson[]
  onSelect: (contactId: string) => void
}) {
  function NameButton({ person }: { person: SharedConnectionPerson }) {
    return (
      <button
        type="button"
        onClick={() => onSelect(person.contactId)}
        className="font-medium text-foreground hover:underline"
      >
        {person.contactName}
      </button>
    )
  }

  if (people.length === 1) {
    return <NameButton person={people[0]} />
  }

  if (people.length === 2) {
    return (
      <>
        <NameButton person={people[0]} /> and <NameButton person={people[1]} />
      </>
    )
  }

  return (
    <>
      {people.slice(0, -1).map((person) => (
        <span key={person.contactId}>
          <NameButton person={person} />
          {", "}
        </span>
      ))}
      {"and "}
      <NameButton person={people[people.length - 1]} />
    </>
  )
}

function formatUniversityDisplay(contact: Contact): string | null {
  const undergrad = contact.undergraduateUniversity?.trim()
  const graduate = contact.graduateUniversity?.trim()

  if (undergrad && graduate) {
    if (undergrad.toLowerCase() === graduate.toLowerCase()) return undergrad
    return `${undergrad}, ${graduate}`
  }

  return undergrad || graduate || null
}

function TrackCalendarEventsRow({
  contact,
  onContactUpdated,
}: {
  contact: Contact
  onContactUpdated?: (contact: Contact) => void
}) {
  const [trackCalendar, setTrackCalendar] = useState(contact.trackCalendar)
  const [saving, setSaving] = useState(false)
  const [savedVisible, setSavedVisible] = useState(false)
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestion = getTrackCalendarSuggestion(contact.connectionType)

  useEffect(() => {
    setTrackCalendar(contact.trackCalendar)
  }, [contact.id, contact.trackCalendar])

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    }
  }, [])

  async function handleToggle(nextValue: boolean) {
    if (saving || nextValue === trackCalendar) return

    const previousValue = trackCalendar
    setTrackCalendar(nextValue)
    setSaving(true)

    try {
      const updated = await updateTrackCalendar(contact.id, nextValue)
      onContactUpdated?.(updated)
      setSavedVisible(true)
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      savedTimeoutRef.current = setTimeout(() => setSavedVisible(false), 1000)
    } catch {
      setTrackCalendar(previousValue)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-border/70 pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-[12px] font-medium text-foreground">Track calendar events</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "text-[10px] text-muted-foreground transition-opacity duration-300",
              savedVisible ? "opacity-100" : "opacity-0",
            )}
          >
            Saved
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={trackCalendar}
            aria-label="Track calendar events"
            disabled={saving}
            onClick={() => void handleToggle(!trackCalendar)}
            className={cn(
              "relative h-5 w-9 shrink-0 rounded-full transition-colors",
              trackCalendar ? "bg-primary" : "bg-muted-foreground/30",
              saving ? "opacity-60" : "",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                trackCalendar ? "translate-x-4" : "translate-x-0",
              )}
            />
          </button>
        </div>
      </div>
      <p
        className={cn(
          "mt-2 flex items-start gap-1.5 text-[11px] leading-snug",
          suggestion.tone === "amber" ? "text-amber-700" : "text-muted-foreground",
        )}
      >
        <Info className="mt-0.5 h-3 w-3 shrink-0 opacity-80" />
        <span>
          {suggestion.prefix} · {suggestion.detail}
        </span>
      </p>
    </div>
  )
}

function ContextRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target
  label: string
  value: string
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 text-[12px] leading-snug text-foreground/80">{value}</dd>
      </div>
    </div>
  )
}
