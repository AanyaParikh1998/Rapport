"use client"

import type { ReactNode } from "react"
import { ChevronDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { previewStyleInstructions } from "@/lib/voice-profiles"
import { previewSampleBody } from "@/lib/voice-samples"
import { OB_USER } from "@/components/onboarding/persona"
import {
  S3_CHAR_MS,
  S3_DURATION_S,
  S3_EMAIL,
  S3_EMAIL_BODY_MS,
  S3_EMAIL_LABEL_MS,
  S3_P1,
  S3_P2,
  S3_STEPS,
} from "@/components/onboarding/scene3-timeline"
import { WalkthroughCursor } from "@/components/onboarding/walkthrough-cursor"

const FOCUS_INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none"

export { S3_DURATION_MS } from "@/components/onboarding/scene3-timeline"

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

function ProfileTagPill({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[#378ADD]/10 px-2 py-0.5 text-[10px] font-medium leading-none text-[#378ADD]",
        className,
      )}
    >
      {name}
    </span>
  )
}

function SimpleSampleCard({
  label,
  body,
  profileName,
  className,
}: {
  label: string
  body: string
  profileName?: string
  className?: string
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-white p-4 shadow-sm", className)}>
      <h3 className="break-words text-sm font-semibold text-foreground">{label}</h3>
      {profileName ? <ProfileTagPill name={profileName} className="mt-1.5" /> : null}
      <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">
        {previewSampleBody(body)}
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
  overflowVisible = false,
}: {
  overlayClass: string
  panelClass: string
  children: ReactNode
  footer: ReactNode
  overflowVisible?: boolean
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
        <div
          className={cn(
            "flex min-w-0 flex-col gap-3",
            overflowVisible ? "overflow-visible" : "overflow-hidden",
          )}
        >
          {children}
        </div>
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

function ProfileDropdownField() {
  return (
    <label className="ob-s3-email-profile-field relative z-30 flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">Assign to profile</span>
      <div className="relative min-w-0">
        <div className="ob-s3-email-profile-trigger flex items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm">
          <span className="relative min-h-[1.25rem] min-w-0 flex-1">
            <span className="ob-s3-email-profile-placeholder block truncate text-muted-foreground">
              Select a profile
            </span>
            <span className="ob-s3-email-profile-value absolute inset-0 truncate text-[13px] text-foreground opacity-0">
              {OB_USER.voiceProfile}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <div
          className="ob-s3-email-profile-menu pointer-events-none absolute left-0 right-0 top-full z-[100] mt-1 rounded-md border border-border bg-white opacity-0 shadow-lg"
          role="listbox"
          aria-hidden
        >
          <div
            className="ob-s3-email-profile-opt-1 w-full px-3 py-3 text-left text-[13px] leading-snug text-foreground"
            role="option"
          >
            {OB_USER.voiceProfile}
          </div>
          <div
            className="ob-s3-email-profile-opt-2 w-full px-3 py-3 text-left text-[13px] leading-snug text-foreground"
            role="option"
          >
            {OB_USER.secondaryVoiceProfile}
          </div>
        </div>
        <WalkthroughCursor className="ob-s3-cursor-dropdown absolute left-[calc(100%-2rem)] top-3 opacity-0" />
      </div>
    </label>
  )
}

export function Scene3PreferencesVoicePanel() {
  return (
    <div
      className="ob-s3-root flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-muted/20"
      style={{ ["--ob-s3-duration" as string]: `${S3_DURATION_S}s` }}
    >
      <div className="ob-s3-step-bar relative z-50 flex h-[30px] shrink-0 items-center justify-end border-b border-border/50 bg-white px-4">
        <p className="ob-s3-step-voice truncate text-[11px] font-medium text-[#378ADD] opacity-0">
          {S3_STEPS.voice.label}
        </p>
        <p className="ob-s3-step-email absolute inset-x-4 truncate text-right text-[11px] font-medium text-[#378ADD] opacity-0">
          {S3_STEPS.email.label}
        </p>
      </div>

      <div className="ob-s3-stage relative min-h-0 flex-1 overflow-hidden">
        <div className="ob-s3-view-profiles absolute inset-0 flex flex-col bg-white p-4">
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

        <div className="ob-s3-view-emails absolute inset-0 flex flex-col bg-white p-4 opacity-0">
          <div className="relative mb-4 flex shrink-0 items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Sample emails</h2>
            <button
              type="button"
              className="ob-s3-add-email-btn inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add sample email
            </button>
            <WalkthroughCursor className="ob-s3-cursor-e absolute right-0 top-[calc(50%-8px)] opacity-0" />
          </div>

          <div className="ob-s3-emails-empty flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/10">
            <p className="text-sm text-muted-foreground">No sample emails yet</p>
          </div>

          <div className="ob-s3-email-card-wrap absolute inset-x-4 bottom-4 top-[3.75rem] flex opacity-0">
            <SimpleSampleCard
              className="ob-s3-email-card w-full max-w-md"
              label={OB_USER.emailSampleLabel}
              body={OB_USER.sampleEmail}
              profileName={OB_USER.voiceProfile}
            />
          </div>

          <FocusModal
            overlayClass="ob-s3-overlay-email"
            panelClass="ob-s3-modal-email overflow-visible"
            overflowVisible
            footer={
              <button
                type="button"
                className="ob-s3-save-email rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
              >
                Save
              </button>
            }
          >
            <FocusField label="Label">
              <Typewriter
                text={OB_USER.emailSampleLabel}
                startDelay={S3_EMAIL.labelTypeStart}
                charMs={S3_EMAIL_LABEL_MS}
              />
            </FocusField>
            <FocusField label="Email" multiline>
              <Typewriter
                text={OB_USER.sampleEmail}
                startDelay={S3_EMAIL.bodyTypeStart}
                charMs={S3_EMAIL_BODY_MS}
              />
            </FocusField>
            <ProfileDropdownField />
          </FocusModal>
        </div>

        <div className="ob-s3-li-caption pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/55 px-6 opacity-0">
          <p className="max-w-md text-center text-sm leading-relaxed text-white">
            You can also add LinkedIn message samples for even more personalized outreach
          </p>
        </div>

        <div className="ob-s3-view-summary absolute inset-0 flex flex-col gap-4 overflow-auto bg-white p-4 opacity-0">
          <div className="mx-auto flex w-full max-w-[576px] flex-wrap justify-center gap-3">
            <SimpleProfileCard
              className="w-full max-w-[280px] flex-1"
              name={OB_USER.voiceProfile}
              styleInstructions={OB_USER.styleInstructions}
            />
            <SimpleProfileCard
              className="w-full max-w-[280px] flex-1"
              name={OB_USER.secondaryVoiceProfile}
              styleInstructions={OB_USER.secondaryStyleInstructions}
            />
          </div>
          <div className="mx-auto w-full max-w-[576px]">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Email samples</h2>
            <SimpleSampleCard
              label={OB_USER.emailSampleLabel}
              body={OB_USER.sampleEmail}
              profileName={OB_USER.voiceProfile}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
