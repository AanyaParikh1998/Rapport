"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Mail, MessageSquare, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  formatIntroDraftNote,
  introFormatToOutreachFormat,
  prependIntroDraftNote,
  type IntroDraftFormat,
  type IntroDraftType,
} from "@/lib/draft-intro-context"
import {
  createOutreachDraft,
  updateOutreachDraft,
  type OutreachDraft,
} from "@/lib/outreach-drafts"
import { fetchVoiceProfiles, type VoiceProfile } from "@/lib/voice-profiles"
import type { Contact } from "@/lib/data"
import type { PotentialIntroducer } from "@/lib/introducers"

const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

type IntroStep = "choose" | "generating" | "draft"

type DraftTab = {
  type: IntroDraftType
  subject: string
  body: string
  suggestions: string
  draftId: string | null
  copied: boolean
}

function createEmptyTab(type: IntroDraftType): DraftTab {
  return {
    type,
    subject: "",
    body: "",
    suggestions: "",
    draftId: null,
    copied: false,
  }
}

export function DraftIntroModal({
  open,
  targetContact,
  introducer,
  onClose,
  onSaved,
}: {
  open: boolean
  targetContact: Contact
  introducer: PotentialIntroducer
  onClose: () => void
  onSaved: (draft: OutreachDraft) => void
}) {
  const [step, setStep] = useState<IntroStep>("choose")
  const [selectedFormat, setSelectedFormat] = useState<IntroDraftFormat | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<VoiceProfile[]>([])
  const [activeTab, setActiveTab] = useState<IntroDraftType>("introducer")
  const [tabs, setTabs] = useState<Record<IntroDraftType, DraftTab>>({
    introducer: createEmptyTab("introducer"),
    forwardable: createEmptyTab("forwardable"),
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const introducerContact = introducer.contact
  const activeDraft = tabs[activeTab]

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    fetchVoiceProfiles()
      .then(setProfiles)
      .catch(() => setProfiles([]))
  }, [open])

  useEffect(() => {
    if (!open) return

    setStep("choose")
    setSelectedFormat(null)
    setSelectedProfileId(null)
    setActiveTab("introducer")
    setTabs({
      introducer: createEmptyTab("introducer"),
      forwardable: createEmptyTab("forwardable"),
    })
    setError(null)
    setSubmitting(false)
    setRegenerating(false)
  }, [open, targetContact.id, introducerContact.id])

  if (!open) return null

  function getErrorMessage(err: unknown) {
    return err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String(err.message)
        : "Something went wrong"
  }

  function handleClose() {
    if (submitting || step === "generating" || regenerating) return
    onClose()
  }

  function updateActiveTab(updates: Partial<DraftTab>) {
    setTabs((current) => ({
      ...current,
      [activeTab]: { ...current[activeTab], ...updates },
    }))
  }

  async function generateBothDrafts(format: IntroDraftFormat, profileId: string | null) {
    setError(null)
    setStep("generating")

    try {
      const response = await fetch("/api/draft-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetContact,
          introducerContact,
          sharedReason: introducer.reason,
          format,
          profileId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate intro drafts")
      }

      setTabs({
        introducer: {
          ...createEmptyTab("introducer"),
          subject: data.introducerDraft?.subject ?? "",
          body: data.introducerDraft?.body ?? "",
        },
        forwardable: {
          ...createEmptyTab("forwardable"),
          subject: data.forwardableDraft?.subject ?? "",
          body: data.forwardableDraft?.body ?? "",
        },
      })
      setActiveTab("introducer")
      setStep("draft")
    } catch (err) {
      setError(getErrorMessage(err))
      setStep("choose")
    }
  }

  async function handleGenerateClick() {
    if (!selectedFormat) return
    await generateBothDrafts(selectedFormat, selectedProfileId)
  }

  async function handleRegenerate() {
    if (!selectedFormat) return

    const trimmedSuggestions = activeDraft.suggestions.trim()
    setError(null)
    setRegenerating(true)

    try {
      const response = await fetch("/api/draft-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetContact,
          introducerContact,
          sharedReason: introducer.reason,
          format: selectedFormat,
          profileId: selectedProfileId,
          draftType: activeTab,
          ...(trimmedSuggestions
            ? {
                suggestions: trimmedSuggestions,
                previousDraft: {
                  subject: selectedFormat === "email" ? activeDraft.subject : null,
                  body: activeDraft.body,
                },
              }
            : {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to regenerate draft")
      }

      updateActiveTab({
        subject: data.subject ?? "",
        body: data.body ?? "",
        suggestions: trimmedSuggestions ? "" : activeDraft.suggestions,
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setRegenerating(false)
    }
  }

  async function handleSave() {
    if (!selectedFormat || !activeDraft.body.trim()) return

    setError(null)
    setSubmitting(true)

    const note = formatIntroDraftNote(activeTab, targetContact.name, introducerContact.name)
    const bodyWithNote = prependIntroDraftNote(note, activeDraft.body)
    const contactId = activeTab === "introducer" ? introducerContact.id : targetContact.id
    const outreachFormat = introFormatToOutreachFormat(selectedFormat)

    try {
      const saved = activeDraft.draftId
        ? await updateOutreachDraft(activeDraft.draftId, {
            format: outreachFormat,
            profileId: selectedProfileId,
            subject: selectedFormat === "email" ? activeDraft.subject : null,
            body: bodyWithNote,
          })
        : await createOutreachDraft({
            contactId,
            format: outreachFormat,
            profileId: selectedProfileId,
            subject: selectedFormat === "email" ? activeDraft.subject : null,
            body: bodyWithNote,
          })

      updateActiveTab({ draftId: saved.id })
      onSaved(saved)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  function formatDraftForClipboard(): string {
    if (selectedFormat === "email") {
      return `Subject: ${activeDraft.subject.trim()}\n\n${activeDraft.body.trim()}`
    }
    return activeDraft.body.trim()
  }

  async function handleCopyToClipboard() {
    if (!activeDraft.body.trim()) return

    try {
      await navigator.clipboard.writeText(formatDraftForClipboard())
      updateActiveTab({ copied: true })
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => updateActiveTab({ copied: false }), 2000)
    } catch {
      setError("Failed to copy to clipboard")
    }
  }

  const introducerFirstName = introducerContact.name.trim().split(/\s+/)[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close intro draft modal"
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-intro-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="draft-intro-title" className="text-sm font-semibold text-foreground">
              Warm intro via {introducerContact.name}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Introduce yourself to {targetContact.name} through {introducerFirstName}.
            </p>
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

        {step === "choose" ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <FormatOption
                label="Email"
                icon={Mail}
                selected={selectedFormat === "email"}
                onClick={() => setSelectedFormat("email")}
              />
              <FormatOption
                label="LinkedIn message"
                icon={MessageSquare}
                selected={selectedFormat === "linkedin_message"}
                onClick={() => setSelectedFormat("linkedin_message")}
              />
            </div>

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
            </label>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" disabled={!selectedFormat} onClick={handleGenerateClick}>
                Generate
              </Button>
            </div>
          </div>
        ) : null}

        {step === "generating" ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-3 text-[13px] font-medium text-foreground">
              Drafting intro request and forwardable message...
            </p>
          </div>
        ) : null}

        {step === "draft" ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
              <TabButton
                active={activeTab === "introducer"}
                onClick={() => setActiveTab("introducer")}
                label={`To ${introducerFirstName}`}
              />
              <TabButton
                active={activeTab === "forwardable"}
                onClick={() => setActiveTab("forwardable")}
                label={`To ${targetContact.name.split(/\s+/)[0]} (forwardable)`}
              />
            </div>

            {selectedFormat === "email" ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Subject</span>
                <input
                  value={activeDraft.subject}
                  onChange={(event) => updateActiveTab({ subject: event.target.value })}
                  className={inputClassName}
                  placeholder="Subject line"
                />
              </label>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                {selectedFormat === "email" ? "Body" : "LinkedIn message"}
              </span>
              <textarea
                value={activeDraft.body}
                onChange={(event) => updateActiveTab({ body: event.target.value })}
                rows={selectedFormat === "email" ? 10 : 8}
                className={cn(inputClassName, "min-h-[180px] resize-y")}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Suggestions for next draft
              </span>
              <input
                type="text"
                value={activeDraft.suggestions}
                onChange={(event) => updateActiveTab({ suggestions: event.target.value })}
                className={inputClassName}
                placeholder="e.g. make it shorter, mention her role more specifically"
              />
            </label>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                {error}
              </p>
            ) : null}

            <div className="mt-1 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRegenerate}
                disabled={submitting || regenerating}
              >
                {regenerating ? "Regenerating..." : "Regenerate"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={submitting || !activeDraft.body.trim()}
              >
                {activeDraft.copied ? "Copied!" : "Copy to clipboard"}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={submitting || !activeDraft.body.trim()}
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
  icon: Icon,
  selected,
  onClick,
}: {
  label: string
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
    </button>
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  )
}
