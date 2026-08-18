"use client"

import type { ReactNode } from "react"
import { ChevronDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { previewSampleBody } from "@/lib/voice-samples"
import { OB_CONTACTS, OB_USER } from "@/components/onboarding/persona"
import {
  S4_DURATION_S,
  S4_EMAIL,
  S4_EMAIL_LABEL_MS,
  S4_LINKEDIN,
  S4_LINKEDIN_LABEL_MS,
} from "@/components/onboarding/scene-my-voice-timeline"
import { WalkthroughCursor } from "@/components/onboarding/walkthrough-cursor"

const FOCUS_INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none"

export { S4_DURATION_MS } from "@/components/onboarding/scene-my-voice-timeline"

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
      {profileName ? (
        <span className="mt-1.5 inline-flex items-center rounded-full bg-[#378ADD]/10 px-2 py-0.5 text-[10px] font-medium leading-none text-[#378ADD]">
          {profileName}
        </span>
      ) : null}
      <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">
        {previewSampleBody(body)}
      </p>
    </div>
  )
}

function Typewriter({
  text,
  startDelay,
  charMs,
}: {
  text: string
  startDelay: number
  charMs: number
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
          "relative z-10 flex w-full max-w-[760px] flex-col overflow-visible rounded-xl border border-border bg-white p-5 opacity-0 shadow-xl",
          panelClass,
        )}
      >
        <div className="flex min-w-0 flex-col gap-4 overflow-visible">{children}</div>
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

function ProfileDropdownField({
  classPrefix,
  selectedProfile,
  selectedIsFirst,
}: {
  classPrefix: string
  selectedProfile: string
  selectedIsFirst: boolean
}) {
  return (
    <label className={`${classPrefix}-field relative z-30 flex min-w-0 flex-col gap-1.5`}>
      <span className="text-xs font-medium text-muted-foreground">Assign to profile</span>
      <div className="relative min-w-0">
        <div
          className={`${classPrefix}-trigger flex items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm`}
        >
          <span className="relative min-h-[1.25rem] min-w-0 flex-1">
            <span className={`${classPrefix}-placeholder block truncate text-muted-foreground`}>
              Select a profile
            </span>
            <span
              className={`${classPrefix}-value absolute inset-0 truncate text-[13px] text-foreground opacity-0`}
            >
              {selectedProfile}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <div
          className={`${classPrefix}-menu pointer-events-none absolute left-0 right-0 top-full z-[100] mt-1 rounded-md border border-border bg-white opacity-0 shadow-lg`}
          role="listbox"
          aria-hidden
        >
          <div
            className={cn(
              `${classPrefix}-opt`,
              "w-full px-3 py-3 text-left text-[13px] leading-snug text-foreground",
              selectedIsFirst && `${classPrefix}-opt-selected`,
            )}
            role="option"
          >
            {OB_USER.voiceProfile}
          </div>
          <div
            className={cn(
              `${classPrefix}-opt`,
              "w-full px-3 py-3 text-left text-[13px] leading-snug text-foreground",
              !selectedIsFirst && `${classPrefix}-opt-selected`,
            )}
            role="option"
          >
            {OB_USER.secondaryVoiceProfile}
          </div>
        </div>
        <WalkthroughCursor className={`${classPrefix}-cursor absolute left-[calc(100%-2rem)] top-3 opacity-0`} />
      </div>
    </label>
  )
}

function GmailIcon() {
  return (
    <svg viewBox="0 0 24 18" className="h-[15px] w-5 shrink-0" aria-hidden>
      <rect x="0.5" y="0.5" width="23" height="17" rx="2.5" fill="white" stroke="#dadce0" />
      <path
        d="M1.5 2.5l10.5 8 10.5-8"
        fill="none"
        stroke="#EA4335"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px] bg-[#0A66C2] text-[10px] font-bold leading-none text-white">
      in
    </span>
  )
}

/** Mock Gmail "Sent" reading pane — the message being copied from. */
function EmailSourceView({ recipientName }: { recipientName: string }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col overflow-hidden rounded-lg border border-[#dadce0] bg-white">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-[#e8eaed] bg-white px-3 py-1.5">
        <GmailIcon />
        <span className="text-[13px] font-medium text-[#5f6368]">Gmail</span>
        <span className="ml-auto text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Sent
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-white p-3">
        <p className="text-[11px] text-muted-foreground">To: {recipientName}</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-[12px] leading-snug text-foreground">
          {OB_USER.sampleEmail}
        </p>
      </div>
    </div>
  )
}

/** Mock LinkedIn messaging thread — the message being copied from. */
function LinkedInMessageSourceView({ contactName }: { contactName: string }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col overflow-hidden rounded-lg border border-[#e0dfdc] bg-white">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-[#e0dfdc] bg-white px-3 py-1.5">
        <LinkedInIcon />
        <span className="text-[13px] font-medium text-foreground">Messaging</span>
        <span className="ml-auto text-[11px] text-muted-foreground">{contactName}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f3f2ef] p-3">
        <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-[#0A66C2] px-3 py-2">
          <p className="whitespace-pre-wrap break-words text-[12px] leading-snug text-white">
            {OB_USER.sampleLinkedIn}
          </p>
        </div>
      </div>
    </div>
  )
}

/** Wraps a source view with the select-highlight → ⌘A → ⌘C → "Copied" choreography. */
function SourcePasteFlowLeft({
  children,
  selectClass,
  kbdAClass,
  kbdCClass,
  copiedClass,
}: {
  children: ReactNode
  selectClass: string
  kbdAClass: string
  kbdCClass: string
  copiedClass: string
}) {
  return (
    <div className="relative min-h-0">
      {children}
      <div className={`${selectClass} pointer-events-none absolute inset-0 rounded-lg bg-[#378ADD]/25`} />
      <span className={`${kbdAClass} ob-kbd ob-pflow-kbd-a absolute bottom-3 left-3`}>⌘A</span>
      <span className={`${kbdCClass} ob-kbd ob-pflow-kbd-c absolute bottom-3 left-3`}>⌘C</span>
      <span className={`${copiedClass} ob-toast absolute left-3 right-3 top-3 text-center`}>
        Copied to clipboard
      </span>
    </div>
  )
}

/** Destination field: empty, then a ⌘V hint, then the full text pops in at once (not typed). */
function PasteRevealField({
  text,
  kbdVClass,
  pasteClass,
}: {
  text: string
  kbdVClass: string
  pasteClass: string
}) {
  return (
    <div className="relative min-h-[64px]">
      <p className={cn("whitespace-pre-wrap break-words opacity-0", pasteClass)}>{text}</p>
      <span className={`${kbdVClass} ob-kbd ob-pflow-kbd-v absolute bottom-1 right-1`}>⌘V</span>
    </div>
  )
}

export function SceneMyVoicePanel() {
  return (
    <div
      className="ob-s4-root flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-muted/20"
      style={{ ["--ob-s4-duration" as string]: `${S4_DURATION_S}s` }}
    >
      <div className="ob-s4-stage relative min-h-0 flex-1 overflow-hidden">
        <div className="ob-s4-view-email absolute inset-0 flex flex-col bg-white p-4">
          <div className="relative mb-4 flex shrink-0 items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Sample emails</h2>
            <button
              type="button"
              className="ob-s4-add-email-btn inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add sample email
            </button>
            <WalkthroughCursor className="ob-s4-cursor-email absolute right-0 top-[calc(50%-8px)] opacity-0" />
          </div>

          <div className="ob-s4-emails-empty flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/10">
            <p className="text-sm text-muted-foreground">No sample emails yet</p>
          </div>

          <div className="ob-s4-email-card-wrap absolute inset-x-4 bottom-4 top-[3.75rem] flex opacity-0">
            <SimpleSampleCard
              className="ob-s4-email-card w-full max-w-md"
              label={OB_USER.emailSampleLabel}
              body={OB_USER.sampleEmail}
              profileName={OB_USER.voiceProfile}
            />
          </div>

          <FocusModal
            overlayClass="ob-s4-overlay-email"
            panelClass="ob-s4-modal-email"
            footer={
              <button
                type="button"
                className="ob-s4-save-email rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
              >
                Save
              </button>
            }
          >
            <FocusField label="Label">
              <Typewriter
                text={OB_USER.emailSampleLabel}
                startDelay={S4_EMAIL.labelTypeStart}
                charMs={S4_EMAIL_LABEL_MS}
              />
            </FocusField>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  From your sent messages
                </span>
                <SourcePasteFlowLeft
                  selectClass="ob-s4-email-select"
                  kbdAClass="ob-s4-email-kbd-a"
                  kbdCClass="ob-s4-email-kbd-c"
                  copiedClass="ob-s4-email-copied"
                >
                  <EmailSourceView recipientName={OB_CONTACTS.marcus.name} />
                </SourcePasteFlowLeft>
              </div>
              <FocusField label="Email" multiline>
                <PasteRevealField
                  text={OB_USER.sampleEmail}
                  kbdVClass="ob-s4-email-kbd-v"
                  pasteClass="ob-s4-email-paste"
                />
              </FocusField>
            </div>

            <ProfileDropdownField
              classPrefix="ob-s4-email-profile"
              selectedProfile={OB_USER.voiceProfile}
              selectedIsFirst
            />
          </FocusModal>
        </div>

        <div className="ob-s4-view-linkedin absolute inset-0 flex flex-col bg-white p-4 opacity-0">
          <div className="relative mb-4 flex shrink-0 items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">LinkedIn message samples</h2>
            <button
              type="button"
              className="ob-s4-add-li-btn inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add sample message
            </button>
            <WalkthroughCursor className="ob-s4-cursor-li absolute right-0 top-[calc(50%-8px)] opacity-0" />
          </div>

          <div className="ob-s4-li-empty flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/10">
            <p className="text-sm text-muted-foreground">No LinkedIn samples yet</p>
          </div>

          <div className="ob-s4-li-card-wrap absolute inset-x-4 bottom-4 top-[3.75rem] flex opacity-0">
            <SimpleSampleCard
              className="ob-s4-li-card w-full max-w-md"
              label={OB_USER.linkedinSampleLabel}
              body={OB_USER.sampleLinkedIn}
              profileName={OB_USER.secondaryVoiceProfile}
            />
          </div>

          <FocusModal
            overlayClass="ob-s4-overlay-li"
            panelClass="ob-s4-modal-li"
            footer={
              <button
                type="button"
                className="ob-s4-save-li rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
              >
                Save
              </button>
            }
          >
            <FocusField label="Label">
              <Typewriter
                text={OB_USER.linkedinSampleLabel}
                startDelay={S4_LINKEDIN.labelTypeStart}
                charMs={S4_LINKEDIN_LABEL_MS}
              />
            </FocusField>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  From your messages
                </span>
                <SourcePasteFlowLeft
                  selectClass="ob-s4-li-select"
                  kbdAClass="ob-s4-li-kbd-a"
                  kbdCClass="ob-s4-li-kbd-c"
                  copiedClass="ob-s4-li-copied"
                >
                  <LinkedInMessageSourceView contactName={OB_CONTACTS.consultant.name} />
                </SourcePasteFlowLeft>
              </div>
              <FocusField label="Message" multiline>
                <PasteRevealField
                  text={OB_USER.sampleLinkedIn}
                  kbdVClass="ob-s4-li-kbd-v"
                  pasteClass="ob-s4-li-paste"
                />
              </FocusField>
            </div>

            <ProfileDropdownField
              classPrefix="ob-s4-li-profile"
              selectedProfile={OB_USER.secondaryVoiceProfile}
              selectedIsFirst={false}
            />
          </FocusModal>
        </div>
      </div>
    </div>
  )
}
