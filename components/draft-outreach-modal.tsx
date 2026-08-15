"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Mail, MessageSquare, StickyNote, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  contactToDraftContext,
  getCharacterLimitForFormat,
  isLinkedInDraftFormat,
  type DraftOutreachFormat,
} from "@/lib/draft-outreach-context"
import {
  createOutreachDraft,
  updateOutreachDraft,
  type OutreachDraft,
} from "@/lib/outreach-drafts"
import { logFollowUpDraftedInteraction, fetchInteractionsByContactId, hasManualFollowUpInteraction } from "@/lib/interactions"
import { fetchVoiceProfiles, type VoiceProfile } from "@/lib/voice-profiles"
import type { Contact } from "@/lib/data"
import type { PostCallDraftContext } from "@/lib/post-call-context"

const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const suggestionsFieldClassName =
  "relative z-[1] w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

type TopLevelFormat = "email" | "linkedin"
type DraftStep = "choose" | "linkedin_type" | "profile" | "generating" | "draft"

export function DraftOutreachModal({
  open,
  contact,
  contacts,
  existingDraft,
  initialFormat = null,
  fromFollowUpsPage = false,
  followUpMode = false,
  postCallContext = null,
  onClose,
  onSaved,
}: {
  open: boolean
  contact: Contact
  contacts: Contact[]
  existingDraft: OutreachDraft | null
  initialFormat?: DraftOutreachFormat | null
  fromFollowUpsPage?: boolean
  followUpMode?: boolean
  postCallContext?: PostCallDraftContext | null
  onClose: () => void
  onSaved: (draft: OutreachDraft) => void
}) {
  const [step, setStep] = useState<DraftStep>("choose")
  const [selectedTopFormat, setSelectedTopFormat] = useState<TopLevelFormat | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<DraftOutreachFormat | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<VoiceProfile[]>([])
  const [activeFormat, setActiveFormat] = useState<DraftOutreachFormat>("email")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [draftId, setDraftId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [suggestions, setSuggestions] = useState("")
  const [draftGeneratedInFollowUpMode, setDraftGeneratedInFollowUpMode] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestionsRef = useRef<HTMLTextAreaElement>(null)
  const suggestionsHadFocusRef = useRef(false)

  const characterLimit = getCharacterLimitForFormat(activeFormat)
  const exceedsCharacterLimit =
    characterLimit !== null && body.length > characterLimit

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setCopied(false)
      suggestionsHadFocusRef.current = false
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [open])

  useEffect(() => {
    if (step !== "draft" || !suggestionsHadFocusRef.current) return

    const frame = requestAnimationFrame(() => {
      suggestionsRef.current?.focus()
      const length = suggestionsRef.current?.value.length ?? 0
      suggestionsRef.current?.setSelectionRange(length, length)
    })

    return () => cancelAnimationFrame(frame)
  }, [step, body, subject])

  useEffect(() => {
    if (!open) return

    fetchVoiceProfiles()
      .then(setProfiles)
      .catch(() => setProfiles([]))
  }, [open])

  useEffect(() => {
    if (!open) return

    if (existingDraft) {
      setStep("draft")
      setSelectedTopFormat(isLinkedInDraftFormat(existingDraft.format) ? "linkedin" : "email")
      setSelectedFormat(existingDraft.format)
      setSelectedProfileId(existingDraft.profileId)
      setActiveFormat(existingDraft.format)
      setSubject(existingDraft.subject ?? "")
      setBody(existingDraft.body)
      setDraftId(existingDraft.id)
      setError(null)
      setSuggestions("")
      setDraftGeneratedInFollowUpMode(false)
      return
    }

    if (initialFormat) {
      if (initialFormat === "email") {
        setSelectedTopFormat("email")
        setSelectedFormat("email")
      } else {
        setSelectedTopFormat("linkedin")
        setSelectedFormat(initialFormat)
      }
      setSelectedProfileId(null)
      setActiveFormat(initialFormat)
      setSubject("")
      setBody("")
      setDraftId(null)
      setError(null)
      setSuggestions("")
      setDraftGeneratedInFollowUpMode(false)
      setStep("profile")
      return
    }

    if (postCallContext) {
      setSelectedTopFormat("email")
      setSelectedFormat("email")
      setSelectedProfileId(null)
      setActiveFormat("email")
      setSubject("")
      setBody("")
      setDraftId(null)
      setError(null)
      setSuggestions("")
      setDraftGeneratedInFollowUpMode(true)
      setStep("profile")
      return
    }

    setStep("choose")
    setSelectedTopFormat(null)
    setSelectedFormat(null)
    setSelectedProfileId(null)
    setActiveFormat("email")
    setSubject("")
    setBody("")
    setDraftId(null)
    setError(null)
    setSuggestions("")
    setDraftGeneratedInFollowUpMode(false)
  }, [open, existingDraft, contact.id, initialFormat, postCallContext])

  if (!open) return null

  function getErrorMessage(err: unknown) {
    return err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String(err.message)
        : "Something went wrong"
  }

  function handleClose() {
    if (submitting || step === "generating") return
    onClose()
  }

  async function resolveFollowUpModeForRequest(contactStage: Contact["stage"]): Promise<boolean> {
    const isAdvancedStage =
      contactStage === "responded" || contactStage === "met_connected"

    if (!isAdvancedStage) {
      return followUpMode
    }

    const interactions = await fetchInteractionsByContactId(contact.id)
    const hasSummarizedInteraction = interactions.some((interaction) =>
      Boolean(interaction.summaryDiscussed?.trim()),
    )
    const hasManualFollowUp = hasManualFollowUpInteraction(interactions)

    return followUpMode || hasSummarizedInteraction || hasManualFollowUp
  }

  async function generateDraft(
    format: DraftOutreachFormat,
    profileId: string | null,
    errorStep: DraftStep,
    regeneration?: {
      suggestions: string
      previousDraft: { subject: string | null; body: string }
    },
  ) {
    setError(null)
    setStep("generating")
    setActiveFormat(format)
    setSelectedFormat(format)
    setSelectedProfileId(profileId)

    try {
      const contactStage = contact.stage
      const effectiveFollowUpMode = await resolveFollowUpModeForRequest(contactStage)

      const requestBody = {
        contact: contactToDraftContext(contact),
        contacts,
        format,
        profileId,
        contactStage,
        fromFollowUpsPage,
        followUpMode: effectiveFollowUpMode,
        ...(postCallContext
          ? {
              preCallNotes: postCallContext.preCallNotes,
              callSummary: {
                discussed: postCallContext.callSummary.discussed,
                commitments: postCallContext.callSummary.commitments,
                next_steps: postCallContext.callSummary.next_steps,
                not_covered: postCallContext.callSummary.not_covered,
              },
            }
          : {}),
        ...(regeneration
          ? {
              suggestions: regeneration.suggestions,
              previousDraft: regeneration.previousDraft,
            }
          : {}),
      }

      console.log("[draft-outreach-modal] request body", requestBody)

      const response = await fetch("/api/draft-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate draft")
      }

      setSubject(data.subject ?? "")
      setBody(data.body ?? "")
      setDraftGeneratedInFollowUpMode(effectiveFollowUpMode)
      setStep("draft")
      if (errorStep === "draft") {
        setSuggestions("")
      }
    } catch (err) {
      setError(getErrorMessage(err))
      setStep(errorStep)
    }
  }

  function handleContinueFromChoose() {
    if (!selectedTopFormat) return
    setError(null)

    if (selectedTopFormat === "email") {
      setSelectedFormat("email")
      setStep("profile")
      return
    }

    setStep("linkedin_type")
  }

  function handleContinueFromLinkedInType() {
    if (!selectedFormat || !isLinkedInDraftFormat(selectedFormat)) return
    setError(null)
    setStep("profile")
  }

  function handleProfileBack() {
    setError(null)
    if (selectedTopFormat === "linkedin") {
      setStep("linkedin_type")
      return
    }
    setStep("choose")
  }

  async function handleGenerateClick() {
    if (!selectedFormat) return
    await generateDraft(selectedFormat, selectedProfileId, "profile")
  }

  async function handleRegenerate() {
    const trimmedSuggestions = suggestions.trim()
    await generateDraft(
      activeFormat,
      selectedProfileId,
      "draft",
      trimmedSuggestions
        ? {
            suggestions: trimmedSuggestions,
            previousDraft: {
              subject: activeFormat === "email" ? subject : null,
              body,
            },
          }
        : undefined,
    )
  }

  async function handleSave() {
    setError(null)
    setSubmitting(true)

    const isNewDraft = !draftId
    const isAdvancedStage =
      contact.stage === "responded" || contact.stage === "met_connected"
    const shouldLogFollowUpDrafted =
      isNewDraft &&
      draftGeneratedInFollowUpMode &&
      (isAdvancedStage || contact.stage === "in_progress")

    try {
      const saved = draftId
        ? await updateOutreachDraft(draftId, {
            format: activeFormat,
            profileId: selectedProfileId,
            subject: activeFormat === "email" ? subject : null,
            body,
          })
        : await createOutreachDraft({
            contactId: contact.id,
            format: activeFormat,
            profileId: selectedProfileId,
            subject: activeFormat === "email" ? subject : null,
            body,
          })

      if (shouldLogFollowUpDrafted) {
        try {
          const interaction = await logFollowUpDraftedInteraction(contact.id)
          console.log("[draft-outreach-modal] Follow-up drafted interaction logged", {
            contactId: contact.id,
            contactStage: contact.stage,
            interactionId: interaction.id,
          })
        } catch (logError) {
          console.error("[draft-outreach-modal] Failed to log Follow-up drafted interaction", {
            contactId: contact.id,
            contactStage: contact.stage,
            error: logError,
          })
        }
      }

      onSaved(saved)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  function formatDraftForClipboard(): string {
    if (activeFormat === "email") {
      return `Subject: ${subject.trim()}\n\n${body.trim()}`
    }
    return body.trim()
  }

  async function handleCopyToClipboard() {
    if (!body.trim()) return

    try {
      await navigator.clipboard.writeText(formatDraftForClipboard())
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Failed to copy to clipboard")
    }
  }

  const selectedProfileName = selectedProfileId
    ? profiles.find((profile) => profile.id === selectedProfileId)?.name
    : null

  const bodyFieldLabel =
    activeFormat === "email"
      ? "Body"
      : activeFormat === "linkedin_note"
        ? "LinkedIn note"
        : "LinkedIn message"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close draft modal"
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-outreach-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-border p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="draft-outreach-title" className="text-sm font-semibold text-foreground">
                Draft outreach for {contact.name}
                {step === "draft" && selectedProfileName ? (
                  <span className="font-normal text-muted-foreground"> · {selectedProfileName}</span>
                ) : null}
              </h2>
              {step === "choose" ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Choose a format to generate a draft in your voice.
                </p>
              ) : step === "linkedin_type" ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Choose the type of LinkedIn outreach.
                </p>
              ) : step === "profile" ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Choose a voice profile to match the right writing style.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={step === "generating"}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-4">
        {step === "choose" ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <FormatOption
                label="Email"
                icon={Mail}
                selected={selectedTopFormat === "email"}
                onClick={() => setSelectedTopFormat("email")}
              />
              <FormatOption
                label="LinkedIn"
                icon={MessageSquare}
                selected={selectedTopFormat === "linkedin"}
                onClick={() => setSelectedTopFormat("linkedin")}
              />
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" disabled={!selectedTopFormat} onClick={handleContinueFromChoose}>
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === "linkedin_type" ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormatOption
                label="Note"
                description="200 characters, connection request"
                icon={StickyNote}
                selected={selectedFormat === "linkedin_note"}
                onClick={() => setSelectedFormat("linkedin_note")}
              />
              <FormatOption
                label="Message"
                description="Existing connection"
                icon={MessageSquare}
                selected={selectedFormat === "linkedin_message"}
                onClick={() => setSelectedFormat("linkedin_message")}
              />
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("choose")}>
                Back
              </Button>
              <Button
                type="button"
                disabled={!selectedFormat || !isLinkedInDraftFormat(selectedFormat)}
                onClick={handleContinueFromLinkedInType}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === "profile" ? (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">Voice profile</span>
              <select
                value={selectedProfileId ?? ""}
                onChange={(event) => setSelectedProfileId(event.target.value || null)}
                className={inputClassName}
              >
                <option value="">No profile</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                {selectedProfileId
                  ? "Only samples assigned to this profile will be used."
                  : "All samples of this format will be used."}
              </p>
            </label>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleProfileBack}>
                Back
              </Button>
              <Button type="button" onClick={handleGenerateClick}>
                Generate
              </Button>
            </div>
          </div>
        ) : null}

        {step === "generating" ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-3 text-[13px] font-medium text-foreground">Drafting in your voice...</p>
          </div>
        ) : null}

        {step === "draft" ? (
          <div className="flex flex-col gap-3">
            {activeFormat === "email" ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Subject</span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className={inputClassName}
                  placeholder="Subject line"
                />
              </label>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">{bodyFieldLabel}</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={
                  activeFormat === "email" ? 12 : activeFormat === "linkedin_note" ? 4 : 8
                }
                className={cn(
                  inputClassName,
                  activeFormat === "email"
                    ? "min-h-[240px]"
                    : activeFormat === "linkedin_note"
                      ? "min-h-[100px]"
                      : "min-h-[180px]",
                  "resize-y",
                )}
              />
              {characterLimit !== null ? (
                <p
                  className={cn(
                    "text-[11px]",
                    exceedsCharacterLimit ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {body.length} / {characterLimit} characters
                </p>
              ) : null}
            </label>

            <div className="relative z-[1]">
              <label htmlFor="draft-suggestions" className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-foreground">
                  Suggest changes for next draft
                </span>
                <textarea
                  id="draft-suggestions"
                  ref={suggestionsRef}
                  value={suggestions}
                  onChange={(event) => setSuggestions(event.target.value)}
                  onFocus={() => {
                    suggestionsHadFocusRef.current = true
                  }}
                  rows={2}
                  className={cn(suggestionsFieldClassName, "min-h-[42px] resize-y")}
                  placeholder="e.g. remove mentions of university, open with her first name, make it shorter"
                />
              </label>
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
        </div>

        {step === "draft" ? (
          <div className="shrink-0 border-t border-border p-5 pt-3">
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="button" variant="outline" onClick={handleRegenerate} disabled={submitting}>
                Regenerate
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={submitting || !body.trim()}
              >
                {copied ? "Copied!" : "Copy to clipboard"}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={submitting || !body.trim() || exceedsCharacterLimit}
                title={exceedsCharacterLimit ? "Message exceeds character limit" : undefined}
              >
                {submitting ? "Saving..." : "Save draft"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function FormatOption({
  label,
  description,
  icon: Icon,
  selected,
  onClick,
}: {
  label: string
  description?: string
  icon: typeof Mail
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border px-4 py-6 text-[13px] font-medium transition-colors",
        selected
          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/20"
          : "border-border bg-background text-foreground hover:bg-muted/60",
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
      {description ? (
        <span className="text-[10px] font-normal text-muted-foreground">{description}</span>
      ) : null}
    </button>
  )
}
