"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  createVoiceProfile,
  updateVoiceProfile,
  type VoiceProfile,
  type VoiceProfileInput,
} from "@/lib/voice-profiles"

const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function emptyForm(): VoiceProfileInput {
  return {
    name: "",
    description: null,
    styleInstructions: null,
  }
}

function profileToForm(profile: VoiceProfile): VoiceProfileInput {
  return {
    name: profile.name,
    description: profile.description,
    styleInstructions: profile.styleInstructions,
  }
}

export function VoiceProfileModal({
  open,
  profile,
  onClose,
  onSaved,
}: {
  open: boolean
  profile: VoiceProfile | null
  onClose: () => void
  onSaved: (profile: VoiceProfile) => void
}) {
  const [form, setForm] = useState<VoiceProfileInput>(() => emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = profile !== null

  useEffect(() => {
    if (open) {
      setForm(profile ? profileToForm(profile) : emptyForm())
      setError(null)
    }
  }, [open, profile])

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
        ? await updateVoiceProfile(profile.id, form)
        : await createVoiceProfile(form)
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
        aria-label="Close voice profile modal"
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-profile-title"
        className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="voice-profile-title" className="text-sm font-semibold text-foreground">
              {isEditing ? "Edit profile" : "New profile"}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {isEditing
                ? "Update this voice profile."
                : "Create a voice profile to group writing samples by context."}
            </p>
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
            <span className="text-[11px] font-medium text-muted-foreground">Name</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className={inputClassName}
              placeholder="VC outreach"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Description <span className="font-normal">(optional)</span>
            </span>
            <textarea
              value={form.description ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value || null,
                }))
              }
              rows={3}
              className={`${inputClassName} resize-y`}
              placeholder="Tone for cold emails to investors..."
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Style instructions <span className="font-normal">(optional)</span>
            </span>
            <textarea
              value={form.styleInstructions ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  styleInstructions: event.target.value || null,
                }))
              }
              rows={6}
              className={`${inputClassName} min-h-[140px] resize-y`}
              placeholder="Tell Rapport how you write. For example: Keep messages under 150 words. Never use em dashes. Never open with I hope this finds you well. Always end with a specific ask. Use casual but professional language."
            />
            <p className="text-[10px] text-muted-foreground">
              These rules are applied every time this profile is used to draft a message.
            </p>
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
