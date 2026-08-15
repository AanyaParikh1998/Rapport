"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { previewSampleBody, type VoiceSample } from "@/lib/voice-samples"

export function VoiceSampleCard({
  sample,
  profileName,
  onEdit,
  onDelete,
}: {
  sample: VoiceSample
  profileName: string | null
  onEdit: (sample: VoiceSample) => void
  onDelete: (id: string) => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirmDelete() {
    setDeleting(true)
    setError(null)

    try {
      await onDelete(sample.id)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String(err.message)
            : "Failed to delete sample",
      )
      setDeleting(false)
    }
  }

  if (confirming) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-[13px] font-medium text-foreground">Delete this sample?</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          &ldquo;{sample.label}&rdquo; will be removed from My Voice.
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
        aria-label={`Edit ${sample.label}`}
        onClick={() => onEdit(sample)}
        className="absolute top-3 right-9 z-10 flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        aria-label={`Delete ${sample.label}`}
        onClick={() => setConfirming(true)}
        className="absolute top-3 right-3 z-10 flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <h3 className="pr-12 text-[13px] font-semibold text-foreground">{sample.label}</h3>
      {profileName ? (
        <span className="mt-1.5 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {profileName}
        </span>
      ) : null}
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
        {previewSampleBody(sample.body)}
      </p>
    </div>
  )
}
