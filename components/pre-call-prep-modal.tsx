"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ClipboardCopy, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Contact } from "@/lib/data"
import type { CalendarEvent } from "@/lib/calendar-matching"
import { formatCalendarEventStartTime } from "@/lib/calendar-time"
import { fetchPreCallPrepData } from "@/lib/contacts"
import type { PreCallTalkingPoints } from "@/lib/post-call-context"
import { formatPrepGeneratedLabel } from "@/lib/post-call-context"
import { supabase } from "@/lib/supabase/client"
import {
  buildInteractionTimeline,
  fetchInteractionsByContactId,
  formatInteractionDayLabel,
  hasInteractionSummary,
  isManualTimelineEntry,
  parseBulletItems,
  type InteractionTimelineEntry,
} from "@/lib/interactions"

type PrepCallApiResult = {
  opening: string
  talking_points: string[]
  questions: string[]
  commitments_to_address: string[]
}

const textareaClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidContactId(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id)
}

function formatEventTimeToday(startDateTime: string): string {
  const start = new Date(startDateTime)
  const now = new Date()
  const isToday =
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate()

  const time = formatCalendarEventStartTime(startDateTime)
  return isToday ? `${time} today` : time
}

function formatUniversity(contact: Contact): string | null {
  const schools = [contact.undergraduateUniversity, contact.graduateUniversity]
    .map((school) => school?.trim())
    .filter(Boolean)

  return schools.length > 0 ? schools.join(", ") : null
}

function buildCopyText({
  contact,
  event,
  timelineEntries,
  prepResult,
  preCallNotes,
}: {
  contact: Contact
  event: CalendarEvent | null
  timelineEntries: InteractionTimelineEntry[]
  prepResult: PreCallTalkingPoints | null
  preCallNotes: string
}): string {
  const lines: string[] = [`Call prep · ${contact.name}`]

  if (event) {
    lines.push(`${event.title} · ${formatEventTimeToday(event.start)}`)
  }

  lines.push(
    "",
    "Contact snapshot",
    `- ${contact.name}, ${contact.role} at ${contact.company}`,
  )

  if (contact.city?.trim()) lines.push(`- ${contact.city}`)
  lines.push(`- ${contact.connectionType}`)
  if (contact.mutualCount != null) lines.push(`- ${contact.mutualCount} mutual connections`)
  const university = formatUniversity(contact)
  if (university) lines.push(`- ${university}`)
  if (contact.goal?.trim()) lines.push(`- Goal: ${contact.goal}`)
  if (contact.linkedinUrl?.trim()) lines.push(`- LinkedIn: ${contact.linkedinUrl}`)

  lines.push("", "Relationship history")
  if (timelineEntries.length === 0) {
    lines.push("No interactions yet.")
  } else {
    for (const entry of timelineEntries) {
      lines.push(`${formatInteractionDayLabel(entry.createdAt)} · ${entry.notes}`)
      if (entry.summaryDiscussed?.trim()) {
        lines.push(`  Discussed: ${entry.summaryDiscussed.trim()}`)
      }
      if (entry.summaryCommitments?.trim()) {
        lines.push(`  Commitments: ${entry.summaryCommitments.trim()}`)
      }
      if (entry.summaryFollowups?.trim()) {
        lines.push(`  Follow-ups: ${entry.summaryFollowups.trim()}`)
      }
    }
  }

  if (prepResult) {
    if (prepResult.opening?.trim()) {
      lines.push("", "How to open", prepResult.opening.trim())
    }

    if (prepResult.talking_points.length > 0) {
      lines.push("", "Topics to cover")
      for (const point of prepResult.talking_points) {
        lines.push(`- ${point}`)
      }
    }

    if (prepResult.questions.length > 0) {
      lines.push("", "Questions to ask")
      for (const question of prepResult.questions) {
        lines.push(`- ${question}`)
      }
    }

    if (prepResult.commitments_to_address.length > 0) {
      lines.push("", "Open commitments")
      for (const commitment of prepResult.commitments_to_address) {
        lines.push(`- ${commitment}`)
      }
    }
  }

  if (preCallNotes.trim()) {
    lines.push("", "Goals for this call", preCallNotes.trim())
  }

  return lines.join("\n")
}

function PrepTimelineItem({ entry }: { entry: InteractionTimelineEntry }) {
  const [expanded, setExpanded] = useState(false)
  const dateLabel = formatInteractionDayLabel(entry.createdAt)
  const isManual = isManualTimelineEntry(entry)
  const showSummary = hasInteractionSummary(entry)

  return (
    <li className="space-y-1">
      <p className="text-[12px] leading-snug">
        <span className="text-muted-foreground">{dateLabel}</span>
        <span className="text-muted-foreground/60"> · </span>
        <span
          className={cn(
            isManual ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {entry.notes}
        </span>
        {showSummary ? (
          <>
            <span className="text-muted-foreground/60"> </span>
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="text-[11px] text-muted-foreground/70 underline-offset-2 hover:text-muted-foreground hover:underline"
            >
              {expanded ? "Hide notes" : "See notes"}
            </button>
          </>
        ) : null}
      </p>

      {showSummary && expanded ? (
        <div className="ml-3 space-y-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
          {entry.summaryDiscussed?.trim() ? (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Discussed
              </p>
              <p className="text-[11px] leading-snug text-foreground">
                {entry.summaryDiscussed.trim()}
              </p>
            </div>
          ) : null}
          {entry.summaryCommitments?.trim() ? (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Commitments
              </p>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[11px] text-foreground">
                {parseBulletItems(entry.summaryCommitments).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {entry.summaryFollowups?.trim() ? (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Follow-ups
              </p>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[11px] text-foreground">
                {parseBulletItems(entry.summaryFollowups).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

export function PreCallPrepModal({
  open,
  contact,
  event = null,
  onClose,
  onContactUpdated,
}: {
  open: boolean
  contact: Contact | null
  event?: CalendarEvent | null
  onClose: () => void
  onContactUpdated: (contact: Contact) => void
}) {
  const [interactionsLoading, setInteractionsLoading] = useState(true)
  const [timelineEntries, setTimelineEntries] = useState<InteractionTimelineEntry[]>([])
  const [preCallNotes, setPreCallNotes] = useState("")
  const [notesLoading, setNotesLoading] = useState(false)
  const [savedToastVisible, setSavedToastVisible] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [prepError, setPrepError] = useState<string | null>(null)
  const [prepResult, setPrepResult] = useState<PreCallTalkingPoints | null>(null)
  const [copied, setCopied] = useState(false)
  const savedToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveInFlightRef = useRef(false)
  const generatingRef = useRef(false)
  const lastSavedNotesRef = useRef("")
  const onContactUpdatedRef = useRef(onContactUpdated)

  onContactUpdatedRef.current = onContactUpdated

  const loadInteractions = useCallback(async (contactId: string) => {
    setInteractionsLoading(true)
    try {
      const interactions = await fetchInteractionsByContactId(contactId)
      setTimelineEntries(buildInteractionTimeline(interactions))
    } catch {
      setTimelineEntries([])
    } finally {
      setInteractionsLoading(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (savedToastTimeoutRef.current) clearTimeout(savedToastTimeoutRef.current)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      saveInFlightRef.current = false
      setSavingNotes(false)
      return
    }

    if (!contact) return

    const contactSnapshot = contact
    let cancelled = false

    setPrepResult(null)
    setPrepError(null)
    setSavedToastVisible(false)
    setCopied(false)
    setNotesLoading(true)
    void loadInteractions(contactSnapshot.id)

    void (async () => {
      try {
        const prepData = await fetchPreCallPrepData(contactSnapshot.id)
        if (cancelled) return

        setPreCallNotes(prepData.preCallNotes)
        lastSavedNotesRef.current = prepData.preCallNotes.trim()
        setPrepResult(prepData.preCallTalkingPoints)

        onContactUpdatedRef.current({
          ...contactSnapshot,
          preCallNotes: prepData.preCallNotes,
          preCallTalkingPoints: prepData.preCallTalkingPoints,
        })
      } catch (error) {
        console.error("[PreCallPrepModal] failed to load pre-call prep data, using contact prop", error)
        if (cancelled) return

        const fallback = contactSnapshot.preCallNotes ?? ""
        setPreCallNotes(fallback)
        lastSavedNotesRef.current = fallback.trim()
        setPrepResult(contactSnapshot.preCallTalkingPoints ?? null)
      } finally {
        if (!cancelled) setNotesLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, contact?.id, loadInteractions])

  function showSavedToast() {
    setSavedToastVisible(true)
    if (savedToastTimeoutRef.current) clearTimeout(savedToastTimeoutRef.current)
    savedToastTimeoutRef.current = setTimeout(() => setSavedToastVisible(false), 2000)
  }

  async function handleSavePreCallNotes(options?: { forceFeedback?: boolean }) {
    if (!contact) return
    if (saveInFlightRef.current) return

    const goalsValue = preCallNotes.trim()

    if (!isValidContactId(contact.id)) {
      console.error("Save error: contact.id is missing or not a valid UUID", {
        contactId: contact.id,
        contact,
      })
      setPrepError("Cannot save: contact ID is missing or invalid.")
      return
    }

    saveInFlightRef.current = true
    setSavingNotes(true)
    setPrepError(null)

    try {
      const { data, error } = await supabase
        .from("contacts")
        .update({ pre_call_notes: goalsValue })
        .eq("id", contact.id)
        .select()

      if (error) throw error

      lastSavedNotesRef.current = goalsValue
      setPreCallNotes(goalsValue)
      onContactUpdatedRef.current({ ...contact, preCallNotes: goalsValue })
      showSavedToast()
    } catch (error) {
      console.error("[PreCallPrepModal] failed to save pre-call notes:", error)
      setPrepError("Could not save your call goals. Try again.")
    } finally {
      saveInFlightRef.current = false
      setSavingNotes(false)
    }
  }

  function handleGoalsBlur(event: React.FocusEvent<HTMLTextAreaElement>) {
    if (generatingRef.current) return

    const relatedTarget = event.relatedTarget as HTMLElement | null
    if (relatedTarget?.dataset.preCallSaveButton !== undefined) return
    if (relatedTarget?.dataset.preCallNoAutosave !== undefined) return

    const goalsValue = preCallNotes.trim()
    void handleSavePreCallNotes()
  }

  async function handleGenerateTalkingPoints() {
    if (!contact || generating) return

    generatingRef.current = true
    setGenerating(true)
    setPrepError(null)

    try {
      const interactions = await fetchInteractionsByContactId(contact.id)
      const requestBody = {
        contact: {
          id: contact.id,
          name: contact.name,
          role: contact.role,
          company: contact.company,
          city: contact.city,
          undergraduateUniversity: contact.undergraduateUniversity,
          graduateUniversity: contact.graduateUniversity,
          connectionType: contact.connectionType,
          mutualCount: contact.mutualCount,
          goal: contact.goal,
          notes: contact.notes,
          linkedinUrl: contact.linkedinUrl,
        },
        interactions: interactions.map((interaction) => ({
          createdAt: interaction.createdAt,
          notes: interaction.notes,
          summaryDiscussed: interaction.summaryDiscussed,
          summaryCommitments: interaction.summaryCommitments,
          summaryFollowups: interaction.summaryFollowups,
        })),
        preCallNotes,
      }

      const response = await fetch("/api/prep-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to generate talking points")
      }

      const apiResult = data as PrepCallApiResult
      const prepResultToSave: PreCallTalkingPoints = {
        opening: apiResult.opening,
        talking_points: apiResult.talking_points,
        questions: apiResult.questions,
        commitments_to_address: apiResult.commitments_to_address,
        generated_at: new Date().toISOString(),
      }

      setPrepResult(prepResultToSave)

      const { data: savedRows, error: saveError } = await supabase
        .from("contacts")
        .update({ pre_call_talking_points: prepResultToSave })
        .eq("id", contact.id)
        .select()

      if (saveError) {
        console.error("[PreCallPrepModal] failed to save talking points:", saveError)
      } else {
        onContactUpdatedRef.current({
          ...contact,
          preCallTalkingPoints: prepResultToSave,
        })
      }
    } catch (error) {
      setPrepError(
        error instanceof Error ? error.message : "Failed to generate talking points",
      )
    } finally {
      generatingRef.current = false
      setGenerating(false)
    }
  }

  async function handleCopyAll() {
    if (!contact) return

    const text = buildCopyText({
      contact,
      event,
      timelineEntries,
      prepResult,
      preCallNotes,
    })

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setPrepError("Could not copy to clipboard.")
    }
  }

  if (!open || !contact) return null

  const university = formatUniversity(contact)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/40"
        onClick={onClose}
        aria-label="Close call prep"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pre-call-prep-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
      >
        <div className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="pre-call-prep-title" className="text-sm font-semibold text-foreground">
                Call prep · {contact.name}
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {event
                  ? `${event.title} · ${formatEventTimeToday(event.start)}`
                  : "Prepare for your next conversation"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section className="space-y-2">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Contact snapshot
            </h3>
            <div className="rounded-lg border border-border bg-muted/10 px-3 py-2.5 text-[12px] leading-relaxed text-foreground">
              <p className="font-medium">
                {contact.name}
                {contact.role || contact.company
                  ? ` · ${[contact.role, contact.company].filter(Boolean).join(" at ")}`
                  : ""}
              </p>
              {contact.city?.trim() ? (
                <p className="text-muted-foreground">{contact.city}</p>
              ) : null}
              <p className="text-muted-foreground">
                {contact.connectionType}
                {contact.mutualCount != null ? ` · ${contact.mutualCount} mutuals` : ""}
              </p>
              {university ? <p className="text-muted-foreground">{university}</p> : null}
              {contact.goal?.trim() ? (
                <p className="mt-1.5 text-foreground">{contact.goal}</p>
              ) : null}
              {contact.linkedinUrl?.trim() ? (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-[11px] text-primary underline-offset-2 hover:underline"
                >
                  LinkedIn profile
                </a>
              ) : null}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Relationship history
            </h3>
            {interactionsLoading ? (
              <p className="text-[12px] text-muted-foreground">Loading history...</p>
            ) : timelineEntries.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No interactions yet.</p>
            ) : (
              <ul className="space-y-2">
                {timelineEntries.map((entry) => (
                  <PrepTimelineItem key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                AI-generated talking points
              </h3>
              <Button
                type="button"
                size="xs"
                variant="outline"
                data-pre-call-no-autosave=""
                onClick={() => void handleGenerateTalkingPoints()}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" data-icon="inline-start" />
                    {prepResult?.generated_at ? "Regenerating..." : "Generating..."}
                  </>
                ) : prepResult?.generated_at ? (
                  "Regenerate"
                ) : (
                  "Generate talking points"
                )}
              </Button>
            </div>

            {generating ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/10 px-3 py-3 text-[12px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating talking points...
              </div>
            ) : prepResult ? (
              <div className="space-y-3">
                <div className="space-y-3 rounded-lg border border-border bg-muted/10 px-3 py-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    How to open
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-foreground">
                    {prepResult.opening?.trim() || "No opening suggestion yet."}
                  </p>
                </div>

                {prepResult.talking_points.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Topics to cover
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[12px] text-foreground">
                      {prepResult.talking_points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {prepResult.questions.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Questions to ask
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[12px] text-foreground">
                      {prepResult.questions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {prepResult.commitments_to_address.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Open commitments
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[12px] text-amber-700 dark:text-amber-400">
                      {prepResult.commitments_to_address.map((commitment) => (
                        <li key={commitment}>{commitment}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                </div>
                {prepResult.generated_at ? (
                  <p className="text-[11px] text-muted-foreground">
                    {formatPrepGeneratedLabel(prepResult.generated_at)}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Generate personalized talking points based on this contact and your history together.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Your goals for this call
            </h3>
            <textarea
              rows={4}
              value={preCallNotes}
              onChange={(event) => setPreCallNotes(event.target.value)}
              onBlur={handleGoalsBlur}
              disabled={notesLoading}
              placeholder={
                notesLoading
                  ? "Loading saved goals..."
                  : "What do you want to get out of this call? e.g. ask for an intro to X, understand their path into VC, share your background and get feedback"
              }
              className={textareaClassName}
            />
          </section>

          {prepError ? (
            <p className="text-[12px] text-destructive">{prepError}</p>
          ) : null}
        </div>

        <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-5 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={savingNotes}
              data-pre-call-save-button=""
              onClick={() => void handleSavePreCallNotes({ forceFeedback: true })}
            >
              {savingNotes ? "Saving..." : "Save notes"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void handleCopyAll()}>
              <ClipboardCopy className="h-3.5 w-3.5" data-icon="inline-start" />
              {copied ? "Copied!" : "Copy all to clipboard"}
            </Button>
          </div>
        </div>
      </div>

      {savedToastVisible
        ? createPortal(
            <div
              role="status"
              aria-live="polite"
              className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background shadow-lg"
            >
              Saved
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
