"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatProfileSampleCounts, previewStyleInstructions, type VoiceProfile } from "@/lib/voice-profiles"

export function VoiceProfileCard({
  profile,
  emailCount,
  noteCount,
  messageCount,
  onEdit,
  onDelete,
}: {
  profile: VoiceProfile
  emailCount: number
  noteCount: number
  messageCount: number
  onEdit: (profile: VoiceProfile) => void
  onDelete: (id: string) => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirmDelete() {
    setDeleting(true)
    setError(null)

    try {
      await onDelete(profile.id)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String(err.message)
            : "Failed to delete profile",
      )
      setDeleting(false)
    }
  }

  if (confirming) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-[13px] font-medium text-foreground">Delete this profile?</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          &ldquo;{profile.name}&rdquo; will be removed. Samples assigned to it will become unassigned.
        </p>

        {error ? <p className="mt-2 text-[11px] text-destructive">{error}</p> : null}

        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            size="xs"
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Confirm"}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => {
              setConfirming(false)
              setError(null)
            }}
            disabled={deleting}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 transition-all hover:shadow-sm">
      <button
        type="button"
        aria-label={`Edit ${profile.name}`}
        onClick={() => onEdit(profile)}
        className="absolute top-3 right-9 z-10 flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        aria-label={`Delete ${profile.name}`}
        onClick={() => setConfirming(true)}
        className="absolute top-3 right-3 z-10 flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <h3 className="pr-12 text-[13px] font-semibold text-foreground">{profile.name}</h3>
      {profile.description ? (
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{profile.description}</p>
      ) : null}
      {profile.styleInstructions ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/80 italic">
          {previewStyleInstructions(profile.styleInstructions)}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {formatProfileSampleCounts(emailCount, noteCount, messageCount)}
      </p>
    </div>
  )
}
