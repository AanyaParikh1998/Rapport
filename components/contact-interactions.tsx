"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CheckCircle2, ChevronRight, ExternalLink, Eye, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Contact, Stage } from "@/lib/data"
import { PreCallPrepSection } from "@/components/pre-call-prep-section"
import { NotesDraftsCollapsibleCard, LogTouchpointBar } from "@/components/notes-drafts-collapsible"
import { PostCallModal } from "@/components/post-call-modal"
import {
  formatPostCallSummaryAsEditableText,
  postCallSummaryFromTimelineEntry,
  type PostCallDraftContext,
  type PostCallModalEditState,
} from "@/lib/post-call-context"
import {
  formatDraftDate,
  formatDraftTypeLabel,
  isDraftMarkedSuccessful,
  previewDraftBody,
  type OutreachDraft,
} from "@/lib/outreach-drafts"
import {
  buildInteractionTimeline,
  clearInteractionsForContact,
  createPostCallInteractionShell,
  insertPostCallInteractionRow,
  createSummarizedManualInteraction,
  deleteInteraction,
  canDeleteTimelineEntry,
  fetchInteractionsByContactId,
  findTodayInteractionWithNotes,
  formatInteractionDayLabel,
  getFollowUpMessageLabel,
  getFollowUpMessageAttachedNote,
  getCallNotesSectionLabel,
  getGmailMessageUrl,
  getInteractionTimelineLabel,
  getPostCallMeetingLabel,
  getQuickTapColumnForStage,
  getQuickTapSection,
  hasInteractionSummary,
  hasSummaryDiscussed,
  isCallNotesTimelineEntry,
  isFollowUpDraftedTimelineEntry,
  isFollowUpMessageTimelineEntry,
  isGmailLoggedTimelineEntry,
  isInteractionFromToday,
  isManualTimelineEntry,
  isPostCallMeetingEntry,
  isScheduledCallMeetingEntry,
  contactHasPreCallNotes,
  logManualInteraction,
  parseBulletItems,
  updateInteractionNote,
  updateFollowUpMessageText,
  updateManualInteraction,
  type ContactInteraction,
  type InteractionTimelineEntry,
  type ManualInteractionKind,
} from "@/lib/interactions"
import {
  INTERACTIONS_CHANGED_EVENT,
} from "@/lib/interactions-events"
import { Button } from "@/components/ui/button"

const TIMELINE_PAGE_SIZE = 10
const QUICK_TAP_DEBOUNCE_MS = 500

const POST_CALL_QUICK_TAP_LABELS = new Set([
  "Had a call",
  "Met in person",
  "Had another call",
  "Met again",
])

const POST_CALL_QUICK_TAP_KINDS = new Set<ManualInteractionKind>(["call", "met"])

function isPostCallQuickTap(stage: Stage, kind: ManualInteractionKind, label: string): boolean {
  return (
    stage === "met_connected" &&
    (POST_CALL_QUICK_TAP_KINDS.has(kind) || POST_CALL_QUICK_TAP_LABELS.has(label))
  )
}

const NOTEWORTHY_QUICK_TAP_LABELS = new Set([
  "Call scheduled",
  "Meeting scheduled",
  "Email response",
])

const noteInputClassName =
  "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const notesTextareaClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export type ContactInteractionsSection = "outreach" | "notes_drafts"

export function ContactInteractions({
  section,
  contact,
  contactId,
  stage,
  postCallHandlers,
  onOpenPrepSheet,
  onNavigateToSummary,
  onNavigateToDraft,
  resolveDraftIdForEntry,
  savedDrafts = [],
  draftsLoading = false,
  deletingDraftId = null,
  onOpenDraft,
  onDeleteDraft,
  highlightSummaryId = null,
  highlightDraftId = null,
}: {
  section: ContactInteractionsSection
  contact: Contact
  contactId: string
  stage: Stage
  postCallHandlers?: {
    onSaved: () => void
    onSaveAndDraftFollowUp: (context: PostCallDraftContext) => void
  }
  onOpenPrepSheet?: () => void
  onNavigateToSummary?: (interactionId: string) => void
  onNavigateToDraft?: (draftId: string) => void
  resolveDraftIdForEntry?: (entry: InteractionTimelineEntry) => string | null
  savedDrafts?: OutreachDraft[]
  draftsLoading?: boolean
  deletingDraftId?: string | null
  onOpenDraft?: (draft: OutreachDraft) => void
  onDeleteDraft?: (draftId: string) => void
  highlightSummaryId?: string | null
  highlightDraftId?: string | null
}) {
  const [interactions, setInteractions] = useState<ContactInteraction[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [loggingKind, setLoggingKind] = useState<ManualInteractionKind | null>(null)
  const [showOtherInput, setShowOtherInput] = useState(false)
  const [otherDescription, setOtherDescription] = useState("")
  const [pendingNoteInteractionId, setPendingNoteInteractionId] = useState<string | null>(null)
  const [pendingNoteValue, setPendingNoteValue] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [clearingHistory, setClearingHistory] = useState(false)
  const [pendingQuickTap, setPendingQuickTap] = useState<{
    label: string
    kind: ManualInteractionKind
  } | null>(null)
  const [pastedNotes, setPastedNotes] = useState("")
  const [summarizing, setSummarizing] = useState(false)
  const [quickTapError, setQuickTapError] = useState<string | null>(null)
  const [postCallModal, setPostCallModal] = useState<{
    label: string
    interactionId: string
    edit?: PostCallModalEditState
  } | null>(null)
  const [updatedToastVisible, setUpdatedToastVisible] = useState(false)
  const updatedToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightActionKeysRef = useRef<Set<string>>(new Set())
  const lastQuickTapByActionRef = useRef<Map<string, number>>(new Map())

  const loadInteractions = useCallback(async () => {
    try {
      const data = await fetchInteractionsByContactId(contactId)
      setInteractions(data)
    } catch {
      setInteractions([])
    } finally {
      setLoading(false)
    }
  }, [contactId])

  useEffect(() => {
    setLoading(true)
    setShowAll(false)
    setShowOtherInput(false)
    setOtherDescription("")
    setPendingNoteInteractionId(null)
    setPendingNoteValue("")
    setPendingQuickTap(null)
    setPastedNotes("")
    setQuickTapError(null)
    setPostCallModal(null)
    loadInteractions()
  }, [contactId, loadInteractions])

  useEffect(() => {
    setShowOtherInput(false)
    setOtherDescription("")
    setPendingNoteInteractionId(null)
    setPendingNoteValue("")
    setPendingQuickTap(null)
    setPastedNotes("")
    setQuickTapError(null)
  }, [stage])

  useEffect(() => {
    function handleInteractionsChanged(event: Event) {
      const changedContactId = (event as CustomEvent<string>).detail
      if (changedContactId === contactId) {
        loadInteractions()
      }
    }

    window.addEventListener(INTERACTIONS_CHANGED_EVENT, handleInteractionsChanged)
    return () => {
      window.removeEventListener(INTERACTIONS_CHANGED_EVENT, handleInteractionsChanged)
    }
  }, [contactId, loadInteractions])

  useEffect(() => {
    return () => {
      if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current)
      if (updatedToastTimeoutRef.current) clearTimeout(updatedToastTimeoutRef.current)
    }
  }, [])

  const timelineEntries = buildInteractionTimeline(interactions)
  const callNotesEntries = timelineEntries.filter(isCallNotesTimelineEntry)
  const followUpMessageEntries = timelineEntries.filter(isFollowUpMessageTimelineEntry)
  const sentDrafts = savedDrafts.filter((draft) => draft.sentAt !== null)
  const unsentDrafts = savedDrafts.filter((draft) => draft.sentAt === null)

  const showPreCallPrep =
    (stage === "responded" || stage === "met_connected") && Boolean(onOpenPrepSheet)
  const quickTapSection = getQuickTapSection(stage, interactions)
  const followUpMessagesCount = followUpMessageEntries.length + sentDrafts.length

  const visibleEntries = showAll
    ? timelineEntries
    : timelineEntries.slice(0, TIMELINE_PAGE_SIZE)

  async function savePendingNote(interactionId: string, note: string) {
    const interaction = interactions.find((item) => item.id === interactionId)
    if (!interaction) return

    const trimmed = note.trim()
    setSavingNote(true)

    try {
      const updated = await updateInteractionNote(
        interactionId,
        interaction.notes,
        trimmed,
      )
      setInteractions((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } finally {
      setSavingNote(false)
    }
  }

  function scheduleNoteSave(interactionId: string, note: string) {
    if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current)
    noteDebounceRef.current = setTimeout(() => {
      savePendingNote(interactionId, note)
    }, 3000)
  }

  function handlePendingNoteChange(value: string) {
    setPendingNoteValue(value)
    if (pendingNoteInteractionId) {
      scheduleNoteSave(pendingNoteInteractionId, value)
    }
  }

  async function handlePendingNoteBlur() {
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current)
      noteDebounceRef.current = null
    }

    if (!pendingNoteInteractionId) return
    await savePendingNote(pendingNoteInteractionId, pendingNoteValue)
  }

  function getQuickTapActionKey(kind: ManualInteractionKind, notes?: string): string {
    if (kind === "other" && notes) return `other:${notes.trim()}`
    return kind
  }

  function canTriggerQuickTapAction(actionKey: string): boolean {
    if (inFlightActionKeysRef.current.has(actionKey)) return false

    const lastAt = lastQuickTapByActionRef.current.get(actionKey) ?? 0
    if (Date.now() - lastAt < QUICK_TAP_DEBOUNCE_MS) return false

    return true
  }

  function markQuickTapTriggered(actionKey: string) {
    lastQuickTapByActionRef.current.set(actionKey, Date.now())
  }

  async function upsertManualEntry(notes: string, kind: ManualInteractionKind) {
    const column = getQuickTapColumnForStage(stage)
    if (!column) return

    const trimmedNotes = notes.trim()
    if (!trimmedNotes) return

    const actionKey = getQuickTapActionKey(kind, trimmedNotes)
    if (!canTriggerQuickTapAction(actionKey)) return

    inFlightActionKeysRef.current.add(actionKey)
    markQuickTapTriggered(actionKey)
    setLoggingKind(kind)

    try {
      if (kind === "other" || kind === "intro") {
        const interaction = await logManualInteraction({
          contactId,
          notes: trimmedNotes,
          stage,
        })

        setInteractions((current) => [interaction, ...current])
        setPendingNoteInteractionId(null)
        setPendingNoteValue("")
        setShowOtherInput(false)
        setOtherDescription("")
        return
      }

      const todayEntry = findTodayInteractionWithNotes(interactions, trimmedNotes)

      if (todayEntry) {
        const noteToKeep =
          pendingNoteInteractionId === todayEntry.id
            ? pendingNoteValue
            : todayEntry.note ?? ""

        const updated = await updateManualInteraction({
          id: todayEntry.id,
          notes: trimmedNotes,
          note: noteToKeep,
        })

        setInteractions((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        )
        setPendingNoteInteractionId(updated.id)
      } else {
        const interaction = await logManualInteraction({
          contactId,
          notes: trimmedNotes,
          stage,
        })

        setInteractions((current) => [interaction, ...current])
        setPendingNoteInteractionId(interaction.id)
        setPendingNoteValue("")
      }

      setShowOtherInput(false)
      setOtherDescription("")
    } catch (error) {
      console.error("[ContactInteractions] quick-tap failed:", error)
    } finally {
      inFlightActionKeysRef.current.delete(actionKey)
      setLoggingKind(null)
    }
  }

  async function handleSummarizeAndSave() {
    if (!pendingQuickTap || summarizing) return

    const trimmedNotes = pastedNotes.trim()
    if (!trimmedNotes) {
      setQuickTapError("Paste your meeting notes before summarizing.")
      return
    }

    setSummarizing(true)
    setQuickTapError(null)

    try {
      const response = await fetch("/api/summarize-interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: trimmedNotes }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to summarize notes")
      }

      const interaction = await createSummarizedManualInteraction({
        contactId,
        stage,
        notes: pendingQuickTap.label,
        summaryDiscussed: data.discussed,
        summaryCommitments: data.commitments,
        summaryFollowups: data.followups,
        rawNotes: trimmedNotes,
      })

      setInteractions((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== interaction.id)
        return [interaction, ...withoutDuplicate]
      })
      setPendingQuickTap(null)
      setPastedNotes("")
    } catch (error) {
      setQuickTapError(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setSummarizing(false)
    }
  }

  async function handleSkipNotes() {
    if (!pendingQuickTap || summarizing) return

    const existingToday = interactions.find(
      (item) =>
        isInteractionFromToday(item.createdAt) && item.notes === pendingQuickTap.label,
    )
    if (existingToday) {
      setPendingQuickTap(null)
      setPastedNotes("")
      return
    }

    setSummarizing(true)
    setQuickTapError(null)

    try {
      const interaction = await createSummarizedManualInteraction({
        contactId,
        stage,
        notes: pendingQuickTap.label,
      })

      setInteractions((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== interaction.id)
        return [interaction, ...withoutDuplicate]
      })
      setPendingQuickTap(null)
      setPastedNotes("")
    } catch (error) {
      setQuickTapError(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setSummarizing(false)
    }
  }

  async function handleClearHistory() {
    if (clearingHistory || interactions.length === 0) return
    if (!window.confirm("Clear all interaction history for this contact?")) return

    setClearingHistory(true)

    try {
      await clearInteractionsForContact(contactId)
      setInteractions([])
      setShowAll(false)
      setPendingNoteInteractionId(null)
      setPendingNoteValue("")
      setShowOtherInput(false)
      setOtherDescription("")
      setPendingQuickTap(null)
      setPastedNotes("")
      setQuickTapError(null)
    } finally {
      setClearingHistory(false)
    }
  }

  function handleQuickTapClick(
    event: React.MouseEvent<HTMLButtonElement>,
    kind: ManualInteractionKind,
    label: string,
  ) {
    event.preventDefault()
    event.stopPropagation()

    if (kind === "other") {
      setShowOtherInput(true)
      setPendingQuickTap(null)
      return
    }

    if (isPostCallQuickTap(stage, kind, label)) {
      setPendingQuickTap(null)
      setPastedNotes("")
      setQuickTapError(null)
      setShowOtherInput(false)
      setOtherDescription("")
      void prepareAndOpenPostCallModal(label)
      return
    }

    if (NOTEWORTHY_QUICK_TAP_LABELS.has(label)) {
      setPendingQuickTap({ label, kind })
      setPastedNotes("")
      setQuickTapError(null)
      setShowOtherInput(false)
      setOtherDescription("")
      return
    }

    void upsertManualEntry(label, kind)
  }

  function handleOtherSubmitClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    void handleOtherSubmit()
  }

  async function handleOtherSubmit() {
    const trimmed = otherDescription.trim()
    if (!trimmed) return

    const actionKey = getQuickTapActionKey("other", trimmed)
    if (!canTriggerQuickTapAction(actionKey)) return

    await upsertManualEntry(trimmed, "other")
  }

  async function prepareAndOpenPostCallModal(
    label: string,
    existingInteractionId?: string,
  ) {
    try {
      const shell = existingInteractionId
        ? await createPostCallInteractionShell({
            contactId,
            stage,
            notes: label,
            existingInteractionId,
          })
        : await insertPostCallInteractionRow({
            contactId,
            stage,
            notes: label,
          })

      setInteractions((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== shell.id)
        return [shell, ...withoutDuplicate]
      })
      setPostCallModal({ label, interactionId: shell.id })
    } catch (error) {
      console.error("[ContactInteractions] failed to prepare post-call interaction:", error)
    }
  }

  function openPostCallModalForEntry(entry: InteractionTimelineEntry) {
    void prepareAndOpenPostCallModal(getPostCallMeetingLabel(entry), entry.id)
  }

  function openPostCallModalForEdit(entry: InteractionTimelineEntry) {
    const savedSummary = postCallSummaryFromTimelineEntry(entry)

    setPostCallModal({
      label: getPostCallMeetingLabel(entry),
      interactionId: entry.id,
      edit: {
        interactionId: entry.id,
        dateLabel: formatInteractionDayLabel(entry.createdAt),
        savedSummary,
        initialTextareaValue:
          entry.rawNotes?.trim() || formatPostCallSummaryAsEditableText(savedSummary),
      },
    })
  }

  function canEditPostCallSummary(entry: InteractionTimelineEntry): boolean {
    return isManualTimelineEntry(entry) && hasSummaryDiscussed(entry)
  }

  async function handleLogFollowUpFromCallNotes(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return

    const interaction = await logManualInteraction({
      contactId,
      notes: trimmed,
      stage,
    })

    setInteractions((current) => [interaction, ...current])
    showUpdatedToast()
  }

  function handlePostCallSaved(result?: { updated?: boolean }) {
    void loadInteractions()
    postCallHandlers?.onSaved()
    if (result?.updated) {
      showUpdatedToast()
    }
  }

  function handleSeeDraft(entry: InteractionTimelineEntry) {
    const draftId = resolveDraftIdForEntry?.(entry) ?? entry.draftId
    if (draftId) onNavigateToDraft?.(draftId)
  }

  async function handleDeleteInteraction(entry: InteractionTimelineEntry) {
    if (!canDeleteTimelineEntry(entry)) return

    if (
      !window.confirm(
        `Delete this interaction from ${formatInteractionDayLabel(entry.createdAt)}?`,
      )
    ) {
      return
    }

    try {
      await deleteInteraction(entry.id, contactId)
      setInteractions((current) => current.filter((item) => item.id !== entry.id))
    } catch (error) {
      console.error("[ContactInteractions] delete failed:", error)
    }
  }

  async function handleUpdateFollowUpMessage(
    entry: InteractionTimelineEntry,
    newText: string,
  ) {
    try {
      const updated = await updateFollowUpMessageText(entry, newText)
      setInteractions((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      showUpdatedToast()
    } catch (error) {
      console.error("[ContactInteractions] follow-up update failed:", error)
    }
  }

  function renderQuickTapPanel(
    section: NonNullable<ReturnType<typeof getQuickTapSection>>,
  ) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {section.actions.map((action) => (
            <Button
              key={action.label}
              type="button"
              size="xs"
              variant="outline"
              disabled={
                (loggingKind === action.kind && action.kind !== "other") ||
                clearingHistory ||
                summarizing
              }
              onClick={(event) => handleQuickTapClick(event, action.kind, action.label)}
              className="text-[11px]"
            >
              {action.label}
            </Button>
          ))}
        </div>

        {pendingQuickTap ? (
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="mb-2 text-[11px] font-medium text-foreground">
              {pendingQuickTap.label}
            </p>
            <textarea
              value={pastedNotes}
              onChange={(event) => setPastedNotes(event.target.value)}
              rows={6}
              placeholder="Paste your meeting notes or a summary of what was discussed..."
              className={cn(notesTextareaClassName, "min-h-[120px] resize-y")}
              disabled={summarizing}
            />

            {quickTapError ? (
              <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
                {quickTapError}
              </p>
            ) : null}

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (summarizing) return
                  setPendingQuickTap(null)
                  setPastedNotes("")
                  setQuickTapError(null)
                }}
                disabled={summarizing}
                className="text-[11px] text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSkipNotes()}
                  disabled={summarizing}
                  className="text-[11px] text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
                >
                  Skip
                </button>
                <Button
                  type="button"
                  size="xs"
                  onClick={() => void handleSummarizeAndSave()}
                  disabled={summarizing || !pastedNotes.trim()}
                >
                  {summarizing ? "Saving..." : "Summarize and save"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {showOtherInput ? (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={otherDescription}
              onChange={(event) => setOtherDescription(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  event.stopPropagation()
                  void handleOtherSubmit()
                }
              }}
              placeholder="Describe the interaction..."
              className={noteInputClassName}
              autoFocus
            />
            <Button
              type="button"
              size="xs"
              disabled={!otherDescription.trim() || loggingKind === "other"}
              onClick={handleOtherSubmitClick}
            >
              Add
            </Button>
          </div>
        ) : null}

        {pendingNoteInteractionId ? (
          <input
            type="text"
            value={pendingNoteValue}
            onChange={(event) => handlePendingNoteChange(event.target.value)}
            onBlur={handlePendingNoteBlur}
            placeholder="Add a note (optional)"
            className={noteInputClassName}
            disabled={savingNote}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn(section === "notes_drafts" && "flex flex-col gap-2")}>
      {section === "notes_drafts" && quickTapSection ? (
        quickTapSection.emphasis === "active" ? (
          <LogTouchpointBar title={quickTapSection.title}>
            {renderQuickTapPanel(quickTapSection)}
          </LogTouchpointBar>
        ) : (
          <NotesDraftsCollapsibleCard title={quickTapSection.title}>
            {renderQuickTapPanel(quickTapSection)}
          </NotesDraftsCollapsibleCard>
        )
      ) : null}

      {section === "notes_drafts" && showPreCallPrep ? (
        <PreCallPrepSection contact={contact} onOpenPrepSheet={onOpenPrepSheet!} />
      ) : null}

      {section === "notes_drafts" && (draftsLoading || unsentDrafts.length > 0) ? (
        <SavedDraftsSection
          contact={contact}
          drafts={unsentDrafts}
          loading={draftsLoading}
          onOpenDraft={onOpenDraft}
          onDeleteDraft={onDeleteDraft}
          deletingDraftId={deletingDraftId}
          highlightDraftId={highlightDraftId}
        />
      ) : null}

      {section === "notes_drafts" && followUpMessagesCount > 0 ? (
        <FollowUpMessagesSection
          entries={followUpMessageEntries}
          sentDrafts={sentDrafts}
          onOpenDraft={onOpenDraft}
          onUpdateEntry={handleUpdateFollowUpMessage}
          onDeleteEntry={handleDeleteInteraction}
        />
      ) : null}

      {section === "notes_drafts" && callNotesEntries.length > 0 ? (
        <NotesDraftsCollapsibleCard
          title={`Call notes (${callNotesEntries.length})`}
          forceExpanded={Boolean(highlightSummaryId)}
        >
          <ul className="flex flex-col gap-2">
            {callNotesEntries.map((entry) => (
              <PostCallSummaryCard
                key={entry.id}
                contact={contact}
                entry={entry}
                highlighted={highlightSummaryId === entry.id}
                canEdit={canEditPostCallSummary(entry)}
                onEditNotes={openPostCallModalForEdit}
                onLogFollowUp={handleLogFollowUpFromCallNotes}
                onDraftFollowUp={
                  postCallHandlers
                    ? (context) => postCallHandlers.onSaveAndDraftFollowUp(context)
                    : undefined
                }
              />
            ))}
          </ul>
        </NotesDraftsCollapsibleCard>
      ) : null}

      {section === "outreach" ? (
        <>
          {loading ? (
            <p className="text-[11px] text-muted-foreground">Loading interactions...</p>
          ) : timelineEntries.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No interactions logged yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {visibleEntries.map((entry) => (
                <InteractionTimelineItem
                  key={entry.id}
                  entry={entry}
                  contact={contact}
                  onSeeNotes={(id) => onNavigateToSummary?.(id)}
                  onAddNotes={openPostCallModalForEntry}
                  onOpenPrepSheet={onOpenPrepSheet}
                  onSeeDraft={handleSeeDraft}
                  onDelete={handleDeleteInteraction}
                />
              ))}

              {!showAll && timelineEntries.length > TIMELINE_PAGE_SIZE ? (
                <li>
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Show more
                  </button>
                </li>
              ) : null}
            </ul>
          )}

          {!loading && interactions.length > 0 ? (
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={clearingHistory || loggingKind !== null}
              className="text-[10px] text-muted-foreground/70 hover:text-muted-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              {clearingHistory ? "Clearing..." : "Clear history"}
            </button>
          ) : null}
        </>
      ) : null}

      {postCallModal ? (
        <PostCallModal
          open
          contact={contact}
          interactionLabel={postCallModal.label}
          interactionId={postCallModal.interactionId}
          editInteraction={postCallModal.edit ?? null}
          onClose={() => setPostCallModal(null)}
          onSaved={handlePostCallSaved}
          onSaveAndDraftFollowUp={
            postCallHandlers
              ? (context) => {
                  postCallHandlers.onSaveAndDraftFollowUp(context)
                  void loadInteractions()
                }
              : undefined
          }
        />
      ) : null}

      {updatedToastVisible
        ? createPortal(
            <div
              role="status"
              aria-live="polite"
              className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background shadow-lg"
            >
              Updated
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function InteractionTimelineItem({
  entry,
  contact,
  onSeeNotes,
  onAddNotes,
  onOpenPrepSheet,
  onSeeDraft,
  onDelete,
}: {
  entry: InteractionTimelineEntry
  contact: Contact
  onSeeNotes: (interactionId: string) => void
  onAddNotes: (entry: InteractionTimelineEntry) => void
  onOpenPrepSheet?: () => void
  onSeeDraft: (entry: InteractionTimelineEntry) => void
  onDelete: (entry: InteractionTimelineEntry) => void
}) {
  const dateLabel = formatInteractionDayLabel(entry.createdAt)
  const isManual = isManualTimelineEntry(entry)
  const showSeeDraft = isFollowUpDraftedTimelineEntry(entry)
  const canDelete = canDeleteTimelineEntry(entry)
  const showGmailLink =
    isGmailLoggedTimelineEntry(entry) && Boolean(entry.gmailMessageId?.trim())

  const actionLink = getTimelineActionLink(entry, contact, {
    onSeeNotes,
    onAddNotes,
    onOpenPrepSheet,
  })

  return (
    <li className="group py-0.5">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-[12px] leading-snug">
          <span className="text-muted-foreground">{dateLabel}</span>
          <span className="text-muted-foreground/50"> · </span>
          <span
            className={cn(
              isManual ? "text-foreground" : "text-muted-foreground/60",
            )}
          >
            {getInteractionTimelineLabel(entry)}
          </span>
          {showGmailLink ? (
            <>
              <span className="text-muted-foreground/50"> · </span>
              <a
                href={getGmailMessageUrl(entry.gmailMessageId!)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/70 underline-offset-2 hover:text-muted-foreground hover:underline"
              >
                Open in Gmail
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          ) : null}
          {actionLink ? (
            <>
              <span className="text-muted-foreground/50"> · </span>
              <button
                type="button"
                onClick={actionLink.onClick}
                className="text-[11px] text-muted-foreground/70 underline-offset-2 hover:text-muted-foreground hover:underline"
              >
                {actionLink.label}
              </button>
            </>
          ) : showSeeDraft ? (
            <>
              <span className="text-muted-foreground/50"> · </span>
              <button
                type="button"
                onClick={() => onSeeDraft(entry)}
                className="text-[11px] text-muted-foreground/70 underline-offset-2 hover:text-muted-foreground hover:underline"
              >
                See draft
              </button>
            </>
          ) : null}
        </p>
        {canDelete ? (
          <button
            type="button"
            onClick={() => onDelete(entry)}
            aria-label="Delete interaction"
            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </li>
  )
}

function getTimelineActionLink(
  entry: InteractionTimelineEntry,
  contact: Contact,
  handlers: {
    onSeeNotes: (interactionId: string) => void
    onAddNotes: (entry: InteractionTimelineEntry) => void
    onOpenPrepSheet?: () => void
  },
): { label: string; onClick: () => void } | null {
  if (isScheduledCallMeetingEntry(entry)) {
    if (!handlers.onOpenPrepSheet) return null

    return {
      label: contactHasPreCallNotes(contact) ? "See prep notes" : "Add prep notes",
      onClick: handlers.onOpenPrepSheet,
    }
  }

  if (isPostCallMeetingEntry(entry)) {
    if (hasInteractionSummary(entry)) {
      return {
        label: "See notes",
        onClick: () => handlers.onSeeNotes(entry.id),
      }
    }

    if (isManualTimelineEntry(entry)) {
      return {
        label: "Add notes",
        onClick: () => handlers.onAddNotes(entry),
      }
    }

    return null
  }

  if (hasInteractionSummary(entry)) {
    return {
      label: "See notes",
      onClick: () => handlers.onSeeNotes(entry.id),
    }
  }

  return null
}

function FollowUpMessagesSection({
  entries,
  sentDrafts,
  onOpenDraft,
  onUpdateEntry,
  onDeleteEntry,
}: {
  entries: InteractionTimelineEntry[]
  sentDrafts: OutreachDraft[]
  onOpenDraft?: (draft: OutreachDraft) => void
  onUpdateEntry: (entry: InteractionTimelineEntry, newText: string) => Promise<void>
  onDeleteEntry: (entry: InteractionTimelineEntry) => Promise<void>
}) {
  const totalCount = entries.length + sentDrafts.length

  return (
    <NotesDraftsCollapsibleCard title={`Follow-up messages (${totalCount})`}>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <FollowUpMessageCard
            key={entry.id}
            entry={entry}
            onUpdate={onUpdateEntry}
            onDelete={onDeleteEntry}
          />
        ))}

        {sentDrafts.map((draft) => (
          <li
            key={draft.id}
            className="rounded-md border border-border bg-muted/10 px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] leading-snug text-foreground">
                  {previewDraftBody(draft.body, 120) || formatDraftTypeLabel(draft.format)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Sent · {formatDraftDate(draft.sentAt ?? draft.createdAt)}
                </p>
              </div>
              {onOpenDraft ? (
                <button
                  type="button"
                  aria-label="View sent draft"
                  onClick={() => onOpenDraft(draft)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </NotesDraftsCollapsibleCard>
  )
}

function FollowUpMessageCard({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: InteractionTimelineEntry
  onUpdate: (entry: InteractionTimelineEntry, newText: string) => Promise<void>
  onDelete: (entry: InteractionTimelineEntry) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const [saving, setSaving] = useState(false)

  const dateLabel = formatInteractionDayLabel(entry.createdAt)
  const primaryText = getFollowUpMessageLabel(entry)
  const attachedNote = getFollowUpMessageAttachedNote(entry)

  function startEditing(event: React.MouseEvent) {
    event.stopPropagation()
    setEditValue(primaryText)
    setIsEditing(true)
    setExpanded(true)
  }

  async function handleSaveEdit(event: React.MouseEvent) {
    event.stopPropagation()
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === primaryText) {
      setIsEditing(false)
      return
    }

    setSaving(true)
    try {
      await onUpdate(entry, trimmed)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEdit(event: React.MouseEvent) {
    event.stopPropagation()
    setIsEditing(false)
    setEditValue(primaryText)
  }

  async function handleDelete(event: React.MouseEvent) {
    event.stopPropagation()
    await onDelete(entry)
  }

  return (
    <li className="rounded-md border border-border bg-background transition-colors">
      <div className="flex items-center gap-1 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center text-left"
        >
          <p className="min-w-0 flex-1 truncate text-[12px] leading-snug">
            <span className="font-medium text-foreground">{primaryText}</span>
            {!expanded ? (
              <span className="font-normal text-muted-foreground"> · {dateLabel}</span>
            ) : null}
          </p>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="Edit follow-up message"
            onClick={startEditing}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Delete follow-up message"
            onClick={handleDelete}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label={expanded ? "Collapse follow-up message" : "Expand follow-up message"}
            onClick={() => setExpanded((current) => !current)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                expanded && "rotate-90",
              )}
            />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="flex flex-col gap-3 border-t border-border px-3 py-2.5">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                rows={3}
                className={cn(notesTextareaClassName, "min-h-[72px] resize-y")}
                disabled={saving}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="text-[11px] text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  size="xs"
                  onClick={handleSaveEdit}
                  disabled={saving || !editValue.trim()}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[12px] leading-relaxed text-foreground">{primaryText}</p>
              <p className="text-[10px] text-muted-foreground">{dateLabel}</p>
              {attachedNote ? (
                <section>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                  </h4>
                  <p className="mt-1 text-[12px] leading-relaxed text-foreground/90">
                    {attachedNote}
                  </p>
                </section>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </li>
  )
}

function SavedDraftsSection({
  contact,
  drafts,
  loading,
  onOpenDraft,
  onDeleteDraft,
  deletingDraftId,
  highlightDraftId,
}: {
  contact: Contact
  drafts: OutreachDraft[]
  loading: boolean
  onOpenDraft?: (draft: OutreachDraft) => void
  onDeleteDraft?: (draftId: string) => void
  deletingDraftId?: string | null
  highlightDraftId?: string | null
}) {
  if (!loading && drafts.length === 0) return null

  const title = loading ? "Saved drafts" : `Saved drafts (${drafts.length})`

  return (
    <NotesDraftsCollapsibleCard
      title={title}
      preview={loading ? "Loading..." : null}
      forceExpanded={Boolean(highlightDraftId)}
    >
      {loading ? (
        <p className="text-[11px] text-muted-foreground">Loading drafts...</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              id={`draft-card-${draft.id}`}
              className={cn(
                "rounded-md border border-border bg-muted/10 px-3 py-2.5 transition-colors",
                highlightDraftId === draft.id && "ring-2 ring-[#378ADD]/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground">
                    {formatDraftTypeLabel(draft.format)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDraftDate(draft.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {isDraftMarkedSuccessful(draft, contact.stage) ? (
                    <span
                      className="flex h-6 w-6 items-center justify-center text-emerald-600"
                      title="Received a response"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label="View draft"
                    onClick={() => onOpenDraft?.(draft)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete draft"
                    onClick={() => onDeleteDraft?.(draft.id)}
                    disabled={deletingDraftId === draft.id}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                {previewDraftBody(draft.body)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </NotesDraftsCollapsibleCard>
  )
}

function PostCallSummaryCard({
  contact,
  entry,
  highlighted,
  canEdit,
  onEditNotes,
  onLogFollowUp,
  onDraftFollowUp,
}: {
  contact: Contact
  entry: InteractionTimelineEntry
  highlighted: boolean
  canEdit: boolean
  onEditNotes: (entry: InteractionTimelineEntry) => void
  onLogFollowUp: (text: string) => Promise<void>
  onDraftFollowUp?: (context: PostCallDraftContext) => void
}) {
  const [expanded, setExpanded] = useState(highlighted)
  const [showFollowUpInput, setShowFollowUpInput] = useState(false)
  const [followUpText, setFollowUpText] = useState("")
  const [loggingFollowUp, setLoggingFollowUp] = useState(false)
  const dateLabel = formatInteractionDayLabel(entry.createdAt)
  const discussedItems = parseBulletItems(entry.summaryDiscussed ?? "")
  const commitmentItems = parseBulletItems(entry.summaryCommitments ?? "")
  const followUpItems = parseBulletItems(entry.summaryFollowups ?? "")
  const notCoveredItems = parseBulletItems(entry.summaryNotCovered ?? "")

  useEffect(() => {
    if (highlighted) setExpanded(true)
  }, [highlighted])

  function handleDraftFollowUp() {
    if (!onDraftFollowUp) return
    onDraftFollowUp({
      preCallNotes: contact.preCallNotes?.trim() ?? "",
      callSummary: {
        discussed: discussedItems,
        not_covered: notCoveredItems.length > 0 ? notCoveredItems : null,
        commitments: commitmentItems,
        next_steps: followUpItems,
      },
    })
  }

  async function handleSaveFollowUpLog() {
    const trimmed = followUpText.trim()
    if (!trimmed || loggingFollowUp) return

    setLoggingFollowUp(true)
    try {
      await onLogFollowUp(trimmed)
      setFollowUpText("")
      setShowFollowUpInput(false)
    } catch (error) {
      console.error("[PostCallSummaryCard] failed to log follow-up:", error)
    } finally {
      setLoggingFollowUp(false)
    }
  }

  return (
    <li
      id={`summary-card-${entry.id}`}
      className={cn(
        "rounded-md border border-border bg-background transition-colors",
        highlighted && "ring-2 ring-[#378ADD]/40",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-90",
            )}
          />
          <p className="min-w-0 flex-1 truncate text-[12px] leading-snug">
            <span className="font-medium text-foreground">{getCallNotesSectionLabel(entry)}</span>
            {!expanded ? (
              <span className="font-normal text-muted-foreground"> · {dateLabel}</span>
            ) : null}
          </p>
        </button>

        {canEdit ? (
          <button
            type="button"
            onClick={() => onEditNotes(entry)}
            className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
            Edit notes
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="flex flex-col gap-3 border-t border-border px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground">{dateLabel}</p>
          {discussedItems.length > 0 ? (
            <section className="rounded-md border border-emerald-200/80 bg-emerald-50/60 px-2.5 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                What was discussed
              </h4>
              <TimelineBulletList items={discussedItems} className="text-emerald-950 dark:text-emerald-100" />
            </section>
          ) : null}

          {commitmentItems.length > 0 ? (
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Commitments
              </h4>
              <TimelineBulletList items={commitmentItems} />
            </section>
          ) : null}

          {followUpItems.length > 0 ? (
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Next steps
              </h4>
              <TimelineBulletList items={followUpItems} />
            </section>
          ) : null}

          {notCoveredItems.length > 0 ? (
            <section className="rounded-md border border-amber-200/80 bg-amber-50/60 px-2.5 py-2 dark:border-amber-900/50 dark:bg-amber-950/20">
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                Topics not covered
              </h4>
              <TimelineBulletList items={notCoveredItems} className="text-amber-950 dark:text-amber-100" />
            </section>
          ) : null}

          {showFollowUpInput ? (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <input
                type="text"
                value={followUpText}
                onChange={(event) => setFollowUpText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void handleSaveFollowUpLog()
                  }
                }}
                placeholder='e.g. "Sent LinkedIn message about AI newsletters"'
                className={noteInputClassName}
                autoFocus
                disabled={loggingFollowUp}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFollowUpInput(false)
                    setFollowUpText("")
                  }}
                  disabled={loggingFollowUp}
                  className="text-[11px] text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  size="xs"
                  onClick={() => void handleSaveFollowUpLog()}
                  disabled={loggingFollowUp || !followUpText.trim()}
                >
                  {loggingFollowUp ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => setShowFollowUpInput(true)}
                className="text-[11px]"
              >
                Log a follow-up
              </Button>
              {onDraftFollowUp ? (
                <Button
                  type="button"
                  size="xs"
                  onClick={handleDraftFollowUp}
                  className="text-[11px]"
                >
                  Draft follow-up message
                </Button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </li>
  )
}

function TimelineBulletList({
  items,
  className,
}: {
  items: string[]
  className?: string
}) {
  return (
    <ul className="mt-1.5 space-y-1">
      {items.map((item, index) => (
        <li
          key={`${index}-${item}`}
          className={cn("flex gap-2 text-[13px] leading-relaxed text-foreground/90", className)}
        >
          <span className="shrink-0 text-muted-foreground">-</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function InteractionTimelineCompact({
  interactions,
  limit = 3,
}: {
  interactions: ContactInteraction[]
  limit?: number
}) {
  const timeline = buildInteractionTimeline(interactions)
  if (timeline.length === 0) return null

  const visible = timeline.slice(0, limit)

  return (
    <ul className="space-y-1">
      {visible.map((entry) => {
        const dateLabel = formatInteractionDayLabel(entry.createdAt)
        const isManual = isManualTimelineEntry(entry)

        return (
          <li key={entry.id}>
            <p className="truncate text-[11px] leading-snug">
              <span className="text-muted-foreground">{dateLabel}</span>
              <span className="text-muted-foreground/60"> · </span>
              <span
                className={cn(
                  isManual ? "font-medium text-foreground/90" : "text-muted-foreground",
                )}
              >
                {getInteractionTimelineLabel(entry)}
              </span>
            </p>
          </li>
        )
      })}
    </ul>
  )
}
