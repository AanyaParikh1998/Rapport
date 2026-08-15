"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  createVoiceSample,
  updateVoiceSample,
  getCharacterLimitForSampleType,
  isLinkedInSampleType,
  LINKEDIN_MESSAGE_LIMIT,
  LINKEDIN_NOTE_LIMIT,
  type VoiceSample,
  type VoiceSampleInput,
  type VoiceSampleType,
} from "@/lib/voice-samples"
import type { VoiceProfile } from "@/lib/voice-profiles"

const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function emptyForm(type: VoiceSampleType): VoiceSampleInput {
  return {
    type,
    profileId: null,
    label: "",
    body: "",
  }
}

function sampleToForm(sample: VoiceSample): VoiceSampleInput {
  return {
    type: sample.type,
    profileId: sample.profileId,
    label: sample.label,
    body: sample.body,
  }
}

function getModalCopy(type: VoiceSampleType, isEditing: boolean) {
  if (type === "linkedin_note") {
    return {
      title: isEditing ? "Edit sample LinkedIn note" : "Add sample LinkedIn note",
      description: isEditing
        ? "Update this writing sample."
        : "Paste a connection request note you've sent to teach Rapport your style.",
      bodyLabel: "LinkedIn note",
      bodyPlaceholder: "Paste the full note here...",
      labelPlaceholder: "Cold outreach note",
    }
  }

  if (type === "linkedin_message") {
    return {
      title: isEditing ? "Edit sample LinkedIn message" : "Add sample LinkedIn message",
      description: isEditing
        ? "Update this writing sample."
        : "Paste a LinkedIn message you've sent to teach Rapport your style.",
      bodyLabel: "LinkedIn message",
      bodyPlaceholder: "Paste the full message here...",
      labelPlaceholder: "Warm reconnect",
    }
  }

  return {
    title: isEditing ? "Edit sample email" : "Add sample email",
    description: isEditing
      ? "Update this writing sample."
      : "Paste an email you've written to teach Rapport your style.",
    bodyLabel: "Email",
    bodyPlaceholder: "Paste the full email here...",
    labelPlaceholder: "Cold outreach to VC",
  }
}

export function VoiceSampleModal({
  open,
  sample,
  sampleType,
  profiles,
  onClose,
  onSaved,
}: {
  open: boolean
  sample: VoiceSample | null
  sampleType: VoiceSampleType
  profiles: VoiceProfile[]
  onClose: () => void
  onSaved: (sample: VoiceSample) => void
}) {
  const [form, setForm] = useState<VoiceSampleInput>(() => emptyForm(sampleType))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = sample !== null
  const activeType = isEditing ? sample.type : sampleType
  const copy = getModalCopy(activeType, isEditing)
  const bodyLength = form.body.length
  const characterLimit = getCharacterLimitForSampleType(activeType)

  useEffect(() => {
    if (open) {
      setForm(sample ? sampleToForm(sample) : emptyForm(sampleType))
      setError(null)
    }
  }, [open, sample, sampleType])

  if (!open) return null

  function getErrorMessage(err: unknown) {
    return err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String(err.message)
        : "Something went wrong"
  }

  function handleClose() {
    if (submitting) return
    onClose()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const saved = isEditing
        ? await updateVoiceSample(sample.id, form)
        : await createVoiceSample(form)
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close voice sample modal"
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-sample-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="voice-sample-title" className="text-sm font-semibold text-foreground">
              {copy.title}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{copy.description}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">Profile</span>
            <select
              value={form.profileId ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  profileId: event.target.value || null,
                }))
              }
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

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">Label</span>
            <input
              required
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              className={inputClassName}
              placeholder={copy.labelPlaceholder}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">{copy.bodyLabel}</span>
            <textarea
              required
              value={form.body}
              onChange={(event) =>
                setForm((current) => ({ ...current, body: event.target.value }))
              }
              rows={isLinkedInSampleType(activeType) ? (activeType === "linkedin_note" ? 4 : 8) : 12}
              className={cn(
                inputClassName,
                activeType === "linkedin_note"
                  ? "min-h-[100px]"
                  : isLinkedInSampleType(activeType)
                    ? "min-h-[180px]"
                    : "min-h-[240px]",
                "resize-y",
              )}
              placeholder={copy.bodyPlaceholder}
            />
            {characterLimit !== null ? (
              <p
                className={cn(
                  "text-[11px]",
                  bodyLength > characterLimit ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {bodyLength} / {characterLimit} characters
              </p>
            ) : null}
          </label>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
              {error}
            </p>
          ) : null}

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
