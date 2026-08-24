"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { KanbanBoard } from "@/components/kanban-board"
import { ContactDetail } from "@/components/contact-detail"
import { AddContactModal } from "@/components/add-contact-modal"
import { EditContactModal } from "@/components/edit-contact-modal"
import { SendMessageConfirmModal } from "@/components/send-message-confirm-modal"
import {
  CalendarMatchBanners,
  getCalendarMatchKey,
} from "@/components/calendar-match-banners"
import { GmailMatchBanners, getGmailMatchKey } from "@/components/gmail-match-banners"
import { PreCallPrepModal } from "@/components/pre-call-prep-modal"
import { PostCallModal } from "@/components/post-call-modal"
import { DraftOutreachModal } from "@/components/draft-outreach-modal"
import {
  PrepCallPromptBanner,
  type PrepCallPrompt,
} from "@/components/prep-call-prompt-banner"
import {
  PastCallMetConnectedFollowUpBanner,
  type PastCallMetConnectedFollowUp,
} from "@/components/past-call-met-connected-follow-up-banner"
import { Button } from "@/components/ui/button"
import {
  applyOptimisticStageChange,
  deleteContact,
  fetchContactById,
  fetchContacts,
  moveContactStage,
  updateContactLastEmailedAt,
} from "@/lib/contacts"
import { notifyContactsChanged } from "@/lib/contacts-events"
import type { Contact, Stage } from "@/lib/data"
import {
  canPrepForUpcomingCall,
  enrichCalendarEventMatch,
  matchCalendarEventsToContacts,
  parseUserExcludedNameParts,
  shouldOfferPastCallMetConnectedFollowUp,
  shouldOpenPostCallModalAfterCalendarConfirm,
  type CalendarEvent,
  type CalendarEventMatch,
} from "@/lib/calendar-matching"
import type { PostCallDraftContext } from "@/lib/post-call-context"
import type { OutreachDraft } from "@/lib/outreach-drafts"
import { fetchUserProfile } from "@/lib/user-profile"
import {
  hasEmailSentInteractionOnCalendarDay,
  hasInteractionNoteOnCalendarDay,
  insertPostCallInteractionRow,
  logManualInteraction,
} from "@/lib/interactions"
import {
  dismissCalendarEventMatch,
  fetchDismissedCalendarEventKeys,
} from "@/lib/dismissed-calendar-events"
import type { GmailMessage } from "@/lib/google-gmail"
import {
  buildGmailInteractionsByContactId,
  computeGmailMatches,
  formatGmailInteractionNote,
  getGmailTargetStage,
  logsGmailEmailOnConfirm,
  type GmailContactInteraction,
  type GmailMessageMatch,
} from "@/lib/gmail-matching"
import {
  confirmGmailMessageMatch,
  dismissGmailMessageMatch,
  isGmailMessageAlreadyConfirmed,
} from "@/lib/logged-gmail-messages"

function PipelinePageContent() {
  const searchParams = useSearchParams()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draftRefreshKey, setDraftRefreshKey] = useState(0)
  const [sendConfirmContact, setSendConfirmContact] = useState<Contact | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarNow, setCalendarNow] = useState(() => Date.now())
  const [dismissedCalendarKeys, setDismissedCalendarKeys] = useState<Set<string>>(
    () => new Set(),
  )
  const [dismissedCalendarLoaded, setDismissedCalendarLoaded] = useState(false)
  const [confirmingCalendarKey, setConfirmingCalendarKey] = useState<string | null>(null)
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([])
  const [gmailMatches, setGmailMatches] = useState<GmailMessageMatch[]>([])
  const [gmailLoggedMessageIds, setGmailLoggedMessageIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [gmailInteractionsByContactId, setGmailInteractionsByContactId] = useState<
    Map<string, GmailContactInteraction[]>
  >(() => new Map())
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailAuthorized, setGmailAuthorized] = useState(false)
  const [dismissedGmailKeys, setDismissedGmailKeys] = useState<Set<string>>(() => new Set())
  const [confirmingGmailKey, setConfirmingGmailKey] = useState<string | null>(null)
  const [prepSheetContact, setPrepSheetContact] = useState<Contact | null>(null)
  const [prepSheetEvent, setPrepSheetEvent] = useState<CalendarEvent | null>(null)
  const [prepPrompt, setPrepPrompt] = useState<PrepCallPrompt | null>(null)
  const [pastCallFollowUp, setPastCallFollowUp] = useState<PastCallMetConnectedFollowUp | null>(
    null,
  )
  const [confirmingPastCallFollowUp, setConfirmingPastCallFollowUp] = useState(false)
  const [userExcludedNameParts, setUserExcludedNameParts] = useState<string[]>([])
  const [userProfileLoaded, setUserProfileLoaded] = useState(false)
  const [postCallModal, setPostCallModal] = useState<{
    contact: Contact
    interactionLabel: string
    interactionId: string
  } | null>(null)
  const [postCallDraftContact, setPostCallDraftContact] = useState<Contact | null>(null)
  const [postCallDraftContext, setPostCallDraftContext] = useState<PostCallDraftContext | null>(
    null,
  )
  const [postCallDraftModalOpen, setPostCallDraftModalOpen] = useState(false)

  function syncContacts(nextContacts: Contact[]) {
    setContacts(nextContacts)
  }

  useEffect(() => {
    if (!prepPrompt) return

    const timeout = setTimeout(() => setPrepPrompt(null), 10_000)
    return () => clearTimeout(timeout)
  }, [prepPrompt])

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
          syncContacts(data)
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

  useEffect(() => {
    let cancelled = false

    async function loadIntegrationData() {
      try {
        const [calendarResponse, gmailResponse] = await Promise.all([
          fetch("/api/calendar/events"),
          fetch("/api/gmail/messages"),
        ])

        const [calendarData, gmailData] = await Promise.all([
          calendarResponse.json(),
          gmailResponse.json(),
        ])

        const messages = Array.isArray(gmailData.messages) ? gmailData.messages : []

        if (cancelled) return

        setCalendarConnected(Boolean(calendarData.connected))
        setCalendarEvents(Array.isArray(calendarData.events) ? calendarData.events : [])

        setGmailConnected(Boolean(gmailData.connected))
        setGmailAuthorized(Boolean(gmailData.gmailAuthorized))
        setGmailMessages(messages)
        setGmailLoggedMessageIds(
          new Set(
            Array.isArray(gmailData.loggedMessageIds) ? gmailData.loggedMessageIds : [],
          ),
        )
        setGmailInteractionsByContactId(
          buildGmailInteractionsByContactId(gmailData.interactionsByContactId),
        )

        if (gmailData.syncedAt) {
          window.localStorage.setItem("gmailLastSyncedAt", gmailData.syncedAt)
        }
      } catch (error) {
        console.error("[pipeline] integration fetch failed", error)
        if (!cancelled) {
          setCalendarConnected(false)
          setCalendarEvents([])
          setGmailConnected(false)
          setGmailAuthorized(false)
          setGmailMessages([])
          setGmailLoggedMessageIds(new Set())
          setGmailInteractionsByContactId(new Map())
        }
      }
    }

    void loadIntegrationData()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadUserProfileNameParts() {
      try {
        const profile = await fetchUserProfile()
        if (!cancelled) {
          setUserExcludedNameParts(parseUserExcludedNameParts(profile?.fullName ?? ""))
        }
      } catch (error) {
        console.error("[pipeline] failed to load user profile for calendar matching", error)
        if (!cancelled) {
          setUserExcludedNameParts([])
        }
      } finally {
        if (!cancelled) {
          setUserProfileLoaded(true)
        }
      }
    }

    void loadUserProfileNameParts()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadDismissedCalendarEvents() {
      try {
        const keys = await fetchDismissedCalendarEventKeys()
        if (!cancelled) {
          setDismissedCalendarKeys(keys)
        }
      } catch (error) {
        console.error("[pipeline] failed to load dismissed calendar events", error)
        if (!cancelled) {
          setDismissedCalendarKeys(new Set())
        }
      } finally {
        if (!cancelled) {
          setDismissedCalendarLoaded(true)
        }
      }
    }

    void loadDismissedCalendarEvents()

    return () => {
      cancelled = true
    }
  }, [])

  const calendarMatches = useMemo(() => {
    if (
      !calendarConnected ||
      !userProfileLoaded ||
      calendarEvents.length === 0 ||
      contacts.length === 0
    ) {
      return []
    }

    return matchCalendarEventsToContacts(calendarEvents, contacts, {
      userExcludedNameParts,
    })
  }, [calendarConnected, userProfileLoaded, calendarEvents, contacts, userExcludedNameParts, calendarNow])

  useEffect(() => {
    const intervalId = window.setInterval(() => setCalendarNow(Date.now()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const visibleCalendarMatches = useMemo(() => {
    if (!dismissedCalendarLoaded) {
      return []
    }

    return calendarMatches
      .flatMap((match) => {
        const contact = contacts.find((item) => item.id === match.contact.id) ?? match.contact
        const enriched = enrichCalendarEventMatch(match, contact, calendarNow)
        return enriched ? [enriched] : []
      })
      .filter((match) => !dismissedCalendarKeys.has(getCalendarMatchKey(match)))
  }, [calendarMatches, dismissedCalendarKeys, dismissedCalendarLoaded, contacts, calendarNow])

  useEffect(() => {
    if (contacts.length === 0) {
      setGmailMatches([])
      return
    }

    if (gmailMessages.length === 0) {
      setGmailMatches([])
      return
    }

    const matches = computeGmailMatches(contacts, gmailMessages, dismissedGmailKeys, {
      loggedMessageIds: gmailLoggedMessageIds,
      interactionsByContactId: gmailInteractionsByContactId,
      connected: gmailConnected,
      authorized: gmailAuthorized,
    })
    setGmailMatches(matches)
  }, [
    contacts,
    gmailMessages,
    dismissedGmailKeys,
    gmailLoggedMessageIds,
    gmailInteractionsByContactId,
    gmailConnected,
    gmailAuthorized,
  ])

  const calendarBannerContactIds = useMemo(() => {
    const ids = new Set<string>()

    for (const match of visibleCalendarMatches) {
      ids.add(match.contact.id)
    }

    for (const match of gmailMatches) {
      ids.add(match.contact.id)
    }

    if (pastCallFollowUp) {
      ids.add(pastCallFollowUp.contactId)
    }

    return ids
  }, [visibleCalendarMatches, gmailMatches, pastCallFollowUp])

  useEffect(() => {
    const contactId = searchParams.get("contact")
    if (!contactId || contacts.length === 0) return

    setSelectedId(contactId)

    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`contact-card-${contactId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    })

    return () => cancelAnimationFrame(frame)
  }, [searchParams, contacts])

  const selected = contacts.find((contact) => contact.id === selectedId) ?? null

  function handleContactCreated(contact: Contact) {
    setContacts((current) => [contact, ...current])
    setSelectedId(contact.id)
  }

  async function handleDeleteContact(id: string) {
    await deleteContact(id)
    setContacts((current) => current.filter((contact) => contact.id !== id))
    setSelectedId((current) => (current === id ? null : current))
  }

  function handleContactUpdated(contact: Contact) {
    setContacts((current) =>
      current.map((existing) => (existing.id === contact.id ? contact : existing)),
    )
    setPrepSheetContact((current) => (current?.id === contact.id ? contact : current))
  }

  function executeMoveContact(
    id: string,
    stage: Stage,
    options?: { logMessageSent?: boolean; sentDraftId?: string | null },
  ) {
    let previousContacts: Contact[] = []

    setContacts((current) => {
      previousContacts = current
      return current.map((contact) =>
        contact.id === id ? applyOptimisticStageChange(contact, stage) : contact,
      )
    })

    moveContactStage(id, stage, options)
      .then((updated) => {
        setContacts((current) =>
          current.map((contact) => (contact.id === id ? updated : contact)),
        )
        if (selectedId === id) {
          setDraftRefreshKey((current) => current + 1)
        }
      })
      .catch(() => {
        syncContacts(previousContacts)
      })
  }

  function handleMoveContact(id: string, stage: Stage) {
    const contact = contacts.find((item) => item.id === id)
    if (!contact) return

    if (contact.stage === "not_contacted" && stage === "in_progress") {
      setSendConfirmContact(contact)
      return
    }

    executeMoveContact(id, stage)
  }

  async function handleConfirmMessageSent(draftId: string | null) {
    if (!sendConfirmContact) return

    const contactId = sendConfirmContact.id
    setSendConfirmContact(null)
    executeMoveContact(contactId, "in_progress", {
      logMessageSent: true,
      sentDraftId: draftId,
    })
  }

  async function handleConfirmMoveOnly() {
    if (!sendConfirmContact) return

    const contactId = sendConfirmContact.id
    setSendConfirmContact(null)
    executeMoveContact(contactId, "in_progress")
  }

  function persistCalendarDismissal(match: CalendarEventMatch) {
    const key = getCalendarMatchKey(match)

    setDismissedCalendarKeys((current) => new Set(current).add(key))

    void dismissCalendarEventMatch(match.contact.id, match.event.id)
      .catch((error) => {
        console.error("[pipeline] failed to persist calendar dismissal", {
          contactId: match.contact.id,
          eventId: match.event.id,
          error,
        })
        setDismissedCalendarKeys((current) => {
          const next = new Set(current)
          next.delete(key)
          return next
        })
      })
  }

  function openPrepSheet(contact: Contact, event: CalendarEvent | null = null) {
    setPrepSheetContact(contact)
    setPrepSheetEvent(event)
  }

  function handleDismissCalendarMatch(match: CalendarEventMatch) {
    persistCalendarDismissal(match)
  }

  function markGmailMessageLogged(messageId: string) {
    const trimmedMessageId = messageId.trim()
    if (!trimmedMessageId) return

    setGmailLoggedMessageIds((current) => {
      if (current.has(trimmedMessageId)) return current
      return new Set(current).add(trimmedMessageId)
    })
  }

  function persistGmailDismissal(match: GmailMessageMatch) {
    const key = getGmailMatchKey(match)

    setDismissedGmailKeys((current) => new Set(current).add(key))
    markGmailMessageLogged(match.message.messageId)

    void dismissGmailMessageMatch(
      match.message.messageId,
      match.contact.id,
      match.message.direction,
      match.message.subject,
    ).catch((error) => {
      console.error("[pipeline] failed to persist Gmail dismissal", {
        contactId: match.contact.id,
        messageId: match.message.messageId,
        error,
      })
      setDismissedGmailKeys((current) => {
        const next = new Set(current)
        next.delete(key)
        return next
      })
      setGmailLoggedMessageIds((current) => {
        const next = new Set(current)
        next.delete(match.message.messageId)
        return next
      })
    })
  }

  function handleDismissGmailMatch(match: GmailMessageMatch) {
    persistGmailDismissal(match)
  }

  async function handleConfirmGmailMatch(match: GmailMessageMatch) {
    const contact = contacts.find((item) => item.id === match.contact.id) ?? match.contact
    const action = match.action
    const messageId = match.message?.messageId?.trim() ?? ""
    const contactId = match.contact?.id?.trim() ?? ""

    if (!action) {
      console.warn("[pipeline] confirm gmail match skipped — no action for current stage", {
        contactId,
        messageId,
        stage: contact.stage,
      })
      return
    }

    if (!messageId || !contactId) {
      console.error("[pipeline] confirm gmail match aborted — missing ids", {
        contactId,
        messageId,
        match,
      })
      return
    }

    const direction = match.message?.direction
    if (direction !== "sent" && direction !== "received") {
      console.error("[pipeline] confirm gmail match aborted — missing direction", {
        contactId,
        messageId,
        direction,
        match,
      })
      return
    }

    const key = getGmailMatchKey(match)
    setConfirmingGmailKey(key)

    let previousContacts: Contact[] = []
    const targetStage = getGmailTargetStage(action)
    const shouldMoveStage = targetStage !== null
    const shouldLogGmailEmail = logsGmailEmailOnConfirm(action)

    if (shouldMoveStage && targetStage) {
      setContacts((current) => {
        previousContacts = current
        return current.map((item) =>
          item.id === contact.id ? applyOptimisticStageChange(item, targetStage) : item,
        )
      })
    }

    try {
      if (shouldMoveStage && targetStage) {
        const updated = await moveContactStage(contactId, targetStage)
        setContacts((current) =>
          current.map((item) => (item.id === contact.id ? updated : item)),
        )
      }

      if (shouldLogGmailEmail) {
        const note =
          action === "received_move_responded"
            ? (formatGmailInteractionNote("received_log", match.message.subject) ??
              "Email received")
            : (formatGmailInteractionNote(action, match.message.subject) ??
              (action === "received_log" ? "Email received" : "Email sent"))

        const interactionStage =
          action === "received_move_responded" ? "in_progress" : (targetStage ?? contact.stage)

        const alreadyConfirmed = await isGmailMessageAlreadyConfirmed(messageId, contactId)
        const hasBareEmailSentDuplicate =
          (action === "sent_move_in_progress" || action === "sent_log_follow_up") &&
          (await hasEmailSentInteractionOnCalendarDay(contactId, match.message.date))
        const hasExactNoteDuplicate = await hasInteractionNoteOnCalendarDay(
          contactId,
          note,
          match.message.date,
        )
        const shouldSkipInteractionLog =
          alreadyConfirmed || hasBareEmailSentDuplicate || hasExactNoteDuplicate

        if (!shouldSkipInteractionLog) {
          await logManualInteraction({
            contactId,
            notes: note,
            stage: interactionStage,
            gmailMessageId: messageId,
          })
          const refreshed = await fetchContactById(contactId)
          if (refreshed) {
            setContacts((current) =>
              current.map((item) => (item.id === contact.id ? refreshed : item)),
            )
          }
        }
      }

      await confirmGmailMessageMatch(
        messageId,
        contactId,
        direction,
        match.message.subject,
      )

      const updatedAfterEmail = await updateContactLastEmailedAt(contactId, match.message.date)
      setContacts((current) =>
        current.map((item) => (item.id === contact.id ? updatedAfterEmail : item)),
      )

      setDismissedGmailKeys((current) => new Set(current).add(key))
      markGmailMessageLogged(messageId)

      if (selectedId === contact.id) {
        setDraftRefreshKey((current) => current + 1)
      }
    } catch (error) {
      console.error("[pipeline] failed to confirm Gmail match", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        supabase:
          typeof error === "object" && error !== null
            ? {
                code: "code" in error ? error.code : undefined,
                details: "details" in error ? error.details : undefined,
                hint: "hint" in error ? error.hint : undefined,
              }
            : undefined,
        contactId,
        messageId,
        action,
        shouldMoveStage,
      })
      if (shouldMoveStage) {
        syncContacts(previousContacts)
      }
    } finally {
      setConfirmingGmailKey(null)
    }
  }

  function handleOpenPrepFromPrompt(match: CalendarEventMatch) {
    setPrepPrompt(null)
    const contact = contacts.find((item) => item.id === match.contact.id) ?? match.contact
    openPrepSheet(contact, match.event)
  }

  function handleOpenPrepFromBanner(match: CalendarEventMatch) {
    const contact = contacts.find((item) => item.id === match.contact.id) ?? match.contact
    openPrepSheet(contact, match.event)
  }

  function openPostCallModal(
    contact: Contact,
    interactionLabel: string,
    interactionId: string,
  ) {
    setPostCallModal({ contact, interactionLabel, interactionId })
  }

  function handlePostCallModalSaved() {
    if (postCallModal && selectedId === postCallModal.contact.id) {
      setDraftRefreshKey((current) => current + 1)
    }
  }

  function handlePostCallDraftFollowUp(context: PostCallDraftContext) {
    if (!postCallModal) return

    setPostCallDraftContact(postCallModal.contact)
    setPostCallDraftContext(context)
    setPostCallDraftModalOpen(true)
    setPostCallModal(null)
  }

  function handlePostCallDraftSaved(draft: OutreachDraft) {
    if (selectedId === draft.contactId) {
      setDraftRefreshKey((current) => current + 1)
    }
    setPostCallDraftModalOpen(false)
    setPostCallDraftContext(null)
    setPostCallDraftContact(null)
  }

  function handleDismissPastCallFollowUp() {
    setPastCallFollowUp(null)
  }

  async function handleConfirmPastCallFollowUp() {
    if (!pastCallFollowUp) return

    const { contactId } = pastCallFollowUp
    setConfirmingPastCallFollowUp(true)

    let previousContacts: Contact[] = []
    setContacts((current) => {
      previousContacts = current
      return current.map((item) =>
        item.id === contactId ? applyOptimisticStageChange(item, "met_connected") : item,
      )
    })

    try {
      const updated = await moveContactStage(contactId, "met_connected")

      setContacts((current) => current.map((item) => (item.id === contactId ? updated : item)))
      setPastCallFollowUp(null)

      if (selectedId === contactId) {
        setDraftRefreshKey((current) => current + 1)
      }
    } catch {
      syncContacts(previousContacts)
    } finally {
      setConfirmingPastCallFollowUp(false)
    }
  }

  async function handleConfirmCalendarMatch(match: CalendarEventMatch) {
    const contact = contacts.find((item) => item.id === match.contact.id) ?? match.contact
    const resolved = enrichCalendarEventMatch(match, contact, Date.now())
    if (!resolved) return

    const priorStage = contact.stage
    const key = getCalendarMatchKey(resolved)
    const { action } = resolved
    setConfirmingCalendarKey(key)

    let previousContacts: Contact[] = []
    const shouldMoveStage = action.type === "move_stage" && action.targetStage !== null

    if (shouldMoveStage && action.targetStage) {
      setContacts((current) => {
        previousContacts = current
        return current.map((item) =>
          item.id === resolved.contact.id
            ? applyOptimisticStageChange(item, action.targetStage!)
            : item,
        )
      })
    }

    try {
      const interactionStage = action.targetStage ?? contact.stage
      let latestContact = contact
      let postCallInteraction: Awaited<ReturnType<typeof insertPostCallInteractionRow>> | null =
        null

      if (shouldMoveStage && action.targetStage) {
        const updated = await moveContactStage(resolved.contact.id, action.targetStage)
        latestContact = updated
        postCallInteraction = await insertPostCallInteractionRow({
          contactId: resolved.contact.id,
          stage: interactionStage,
          notes: action.interactionNote,
        })

        setContacts((current) =>
          current.map((item) => (item.id === resolved.contact.id ? updated : item)),
        )
      } else {
        postCallInteraction = await insertPostCallInteractionRow({
          contactId: resolved.contact.id,
          stage: interactionStage,
          notes: action.interactionNote,
        })
      }

      persistCalendarDismissal(resolved)

      if (selectedId === resolved.contact.id) {
        setDraftRefreshKey((current) => current + 1)
      }

      if (shouldOpenPostCallModalAfterCalendarConfirm({ ...resolved, contact: latestContact })) {
        if (postCallInteraction) {
          openPostCallModal(latestContact, action.interactionNote, postCallInteraction.id)
        }
      } else if (canPrepForUpcomingCall({ ...resolved, contact: latestContact })) {
        setPrepPrompt({
          match: { ...resolved, contact: latestContact },
          movedToResponded: shouldMoveStage && action.targetStage === "responded",
        })
      } else if (
        shouldOfferPastCallMetConnectedFollowUp({
          timing: resolved.timing,
          priorStage,
          action,
        })
      ) {
        setPastCallFollowUp({
          contactId: latestContact.id,
          contactName: latestContact.name,
        })
      }
    } catch {
      if (shouldMoveStage) {
        syncContacts(previousContacts)
      }
    } finally {
      setConfirmingCalendarKey(null)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <div>
            <h1 className="text-sm font-semibold text-foreground">Pipeline</h1>
            <p className="text-[11px] text-muted-foreground">
              {loading
                ? "Loading contacts..."
                : `${contacts.length} contacts across your outreach funnel`}
            </p>
          </div>

          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus data-icon="inline-start" />
            Add contact
          </Button>
        </header>

        {loadError ? (
          <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-[12px] text-destructive">
            {loadError}
          </div>
        ) : null}

        <CalendarMatchBanners
          matches={visibleCalendarMatches}
          dismissedKeys={dismissedCalendarKeys}
          confirmingKey={confirmingCalendarKey}
          onDismiss={handleDismissCalendarMatch}
          onConfirm={(match) => void handleConfirmCalendarMatch(match)}
          onPrep={handleOpenPrepFromBanner}
        />

        <GmailMatchBanners
          matches={gmailMatches}
          dismissedKeys={dismissedGmailKeys}
          confirmingKey={confirmingGmailKey}
          onDismiss={handleDismissGmailMatch}
          onConfirm={(match) => void handleConfirmGmailMatch(match)}
        />

        {pastCallFollowUp ? (
          <PastCallMetConnectedFollowUpBanner
            followUp={{
              ...pastCallFollowUp,
              contactName:
                contacts.find((item) => item.id === pastCallFollowUp.contactId)?.name ??
                pastCallFollowUp.contactName,
            }}
            confirming={confirmingPastCallFollowUp}
            onConfirm={() => void handleConfirmPastCallFollowUp()}
            onDismiss={handleDismissPastCallFollowUp}
          />
        ) : null}

        {prepPrompt ? (
          <PrepCallPromptBanner
            prompt={prepPrompt}
            onOpenPrep={handleOpenPrepFromPrompt}
            onDismiss={() => setPrepPrompt(null)}
          />
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
        <KanbanBoard
          contacts={contacts}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onEdit={setEditingContact}
          onDelete={handleDeleteContact}
          onMove={handleMoveContact}
          calendarBannerContactIds={calendarBannerContactIds}
        />
        </div>
      </main>

      <ContactDetail
        contact={selected}
        contacts={contacts}
        draftRefreshKey={draftRefreshKey}
        onSelectContact={setSelectedId}
        calendarBannerContactIds={calendarBannerContactIds}
        onContactUpdated={handleContactUpdated}
      />

      <AddContactModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleContactCreated}
        contacts={contacts}
      />

      <EditContactModal
        contact={editingContact}
        onClose={() => setEditingContact(null)}
        onUpdated={handleContactUpdated}
        contacts={contacts}
      />

      <SendMessageConfirmModal
        contact={sendConfirmContact}
        open={sendConfirmContact !== null}
        onClose={() => setSendConfirmContact(null)}
        onConfirmSent={handleConfirmMessageSent}
        onConfirmMoveOnly={handleConfirmMoveOnly}
      />

      <PreCallPrepModal
        open={prepSheetContact !== null}
        contact={prepSheetContact}
        event={prepSheetEvent}
        onClose={() => {
          setPrepSheetContact(null)
          setPrepSheetEvent(null)
        }}
        onContactUpdated={handleContactUpdated}
      />

      {postCallModal ? (
        <PostCallModal
          open
          contact={postCallModal.contact}
          interactionLabel={postCallModal.interactionLabel}
          interactionId={postCallModal.interactionId}
          onClose={() => setPostCallModal(null)}
          onSaved={handlePostCallModalSaved}
          onSaveAndDraftFollowUp={handlePostCallDraftFollowUp}
        />
      ) : null}

      {postCallDraftContact ? (
        <DraftOutreachModal
          open={postCallDraftModalOpen}
          contact={postCallDraftContact}
          contacts={contacts}
          existingDraft={null}
          followUpMode
          postCallContext={postCallDraftContext}
          onClose={() => {
            setPostCallDraftModalOpen(false)
            setPostCallDraftContext(null)
            setPostCallDraftContact(null)
          }}
          onSaved={handlePostCallDraftSaved}
        />
      ) : null}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-[13px] text-muted-foreground">
          Loading pipeline...
        </div>
      }
    >
      <PipelinePageContent />
    </Suspense>
  )
}
