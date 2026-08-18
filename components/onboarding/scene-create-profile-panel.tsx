"use client"

import type { ReactNode } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { previewStyleInstructions } from "@/lib/voice-profiles"
import { OB_USER } from "@/components/onboarding/persona"
import {
  S3_CHAR_MS,
  S3_DURATION_S,
  S3_P1,
  S3_P2,
} from "@/components/onboarding/scene-create-profile-timeline"
import { WalkthroughCursor } from "@/components/onboarding/walkthrough-cursor"

const FOCUS_INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none"

export { S3_DURATION_MS } from "@/components/onboarding/scene-create-profile-timeline"

function SimpleProfileCard({
  name,
  styleInstructions,
  className,
}: {
  name: string
  styleInstructions: string
  className?: string
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-white p-4 shadow-sm", className)}>
      <h3 className="break-words text-sm font-semibold text-foreground">{name}</h3>
      <p className="mt-1.5 break-words text-xs leading-relaxed text-muted-foreground">
        {previewStyleInstructions(styleInstructions)}
      </p>
    </div>
  )
}

function Typewriter({
  text,
  startDelay,
  charMs = S3_CHAR_MS,
}: {
  text: string
  startDelay: number
  charMs?: number
}) {
  return (
    <span className="ob-s3-typewriter inline break-words [overflow-wrap:anywhere] whitespace-pre-wrap">
      {text.split("").map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          className="ob-tw-char"
          style={{ animationDelay: `${startDelay + i * charMs}s` }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  )
}

function FocusModal({
  overlayClass,
  panelClass,
  children,
  footer,
}: {
  overlayClass: string
  panelClass: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="ob-s3-modal-layer pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
      <div className={cn("absolute inset-0 bg-black/40 opacity-0", overlayClass)} />
      <div
        className={cn(
          "relative z-10 flex w-full max-w-[580px] flex-col rounded-xl border border-border bg-white p-5 opacity-0 shadow-xl",
          panelClass,
        )}
      >
        <div className="flex min-w-0 flex-col gap-3 overflow-hidden">{children}</div>
        <div className="mt-4 flex shrink-0 justify-end">{footer}</div>
      </div>
    </div>
  )
}

function FocusField({
  label,
  children,
  multiline = false,
}: {
  label: string
  children: ReactNode
  multiline?: boolean
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div
        className={cn(
          FOCUS_INPUT_CLASS,
          "min-w-0 bg-white text-sm",
          multiline
            ? "ob-s3-field-multiline max-h-[140px] overflow-hidden p-3 leading-relaxed"
            : "break-words px-3 py-2 [overflow-wrap:anywhere]",
        )}
      >
        {children}
      </div>
    </label>
  )
}

export function SceneCreateProfilePanel() {
  return (
    <div
      className="ob-s3-root flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-muted/20"
      style={{ ["--ob-s3-duration" as string]: `${S3_DURATION_S}s` }}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden bg-white p-4">
        <div className="relative mb-4 flex shrink-0 items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Profiles</h2>
          <button
            type="button"
            className="ob-s3-new-profile-btn inline-flex items-center gap-1 rounded-md border border-input bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New profile
          </button>
          <WalkthroughCursor className="ob-s3-cursor-p absolute right-0 top-[calc(50%-8px)] opacity-0" />
          <WalkthroughCursor className="ob-s3-cursor-p2 absolute right-0 top-[calc(50%-8px)] opacity-0" />
        </div>

        <div className="ob-s3-profiles-empty flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/10">
          <p className="text-sm text-muted-foreground">No profiles yet</p>
        </div>

        <div className="ob-s3-profiles-grid absolute inset-x-4 bottom-4 top-[3.75rem] grid grid-cols-2 gap-3 opacity-0">
          <SimpleProfileCard
            className="ob-s3-profile-card-1"
            name={OB_USER.voiceProfile}
            styleInstructions={OB_USER.styleInstructions}
          />
          <SimpleProfileCard
            className="ob-s3-profile-card-2"
            name={OB_USER.secondaryVoiceProfile}
            styleInstructions={OB_USER.secondaryStyleInstructions}
          />
        </div>

        <FocusModal
          overlayClass="ob-s3-overlay-p1"
          panelClass="ob-s3-modal-p1"
          footer={
            <button
              type="button"
              className="ob-s3-save-p1 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              Save
            </button>
          }
        >
          <FocusField label="Name">
            <Typewriter text={OB_USER.voiceProfile} startDelay={S3_P1.nameTypeStart} />
          </FocusField>
          <FocusField label="Style instructions" multiline>
            <Typewriter text={OB_USER.styleInstructions} startDelay={S3_P1.styleTypeStart} />
          </FocusField>
        </FocusModal>

        <FocusModal
          overlayClass="ob-s3-overlay-p2"
          panelClass="ob-s3-modal-p2"
          footer={
            <button
              type="button"
              className="ob-s3-save-p2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              Save
            </button>
          }
        >
          <FocusField label="Name">
            <Typewriter text={OB_USER.secondaryVoiceProfile} startDelay={S3_P2.nameTypeStart} />
          </FocusField>
          <FocusField label="Style instructions" multiline>
            <Typewriter
              text={OB_USER.secondaryStyleInstructions}
              startDelay={S3_P2.styleTypeStart}
            />
          </FocusField>
        </FocusModal>
      </div>
    </div>
  )
}
