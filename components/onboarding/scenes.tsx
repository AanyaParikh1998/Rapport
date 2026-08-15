"use client"

import type { ComponentType, ReactNode } from "react"
import { AlertTriangle, Check, Mail, MessageSquare, X } from "lucide-react"
import { IconCalendar } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { getInitials } from "@/lib/initials"
import {
  ManualDropdownField,
  ManualTextInputField,
  type ManualDropdownDef,
  type ManualTextInputDef,
} from "@/components/onboarding/manual-dropdown-field"
import { DraftVoiceProfileDropdown } from "@/components/onboarding/draft-voice-dropdown"
import { S7_DURATION_MS } from "@/components/onboarding/scene7-timeline"
import { S11_DURATION_MS } from "@/components/onboarding/scene11-timeline"
import {
  Scene2PreferencesProfilePanel,
  Scene3PreferencesVoicePanel,
} from "@/components/onboarding/preferences-mocks"
import { WalkthroughCursor } from "@/components/onboarding/walkthrough-cursor"
import { S5_DURATION_MS, S5_EMAIL_CHAR_MS, S5_EMAIL_TEXT, S5_EMAIL_TYPING_START } from "@/components/onboarding/scene5-timeline"
import {
  S3_CAPTION_FINAL_MS,
  S3_CAPTION_MID_MS,
  S3_DURATION_MS,
} from "@/components/onboarding/scene3-timeline"
import {
  OB_CONTACTS,
  OB_DRAFT_BODY_LINES,
  OB_DRAFT_SUBJECT,
  OB_RAW_LINKEDIN_PRIYA,
  OB_USER,
  STAGE_BORDER,
} from "@/components/onboarding/persona"

export type WalkthroughSceneDef = {
  id: string
  actLabel: string | null
  caption: string
  captionPhases?: { atMs: number; text: string }[]
  static: boolean
  durationMs: number
  Component: ComponentType
}

const TW = 0.04

function Typewriter({
  text,
  startDelay,
  charMs = TW,
}: {
  text: string
  startDelay: number
  charMs?: number
}) {
  return (
    <>
      {text.split("").map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          className="ob-tw-char"
          style={{ animationDelay: `${startDelay + i * charMs}s` }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </>
  )
}

function UiPasteLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  )
}

function UiFieldAutofill({
  label,
  value,
  fieldClass,
  multiline = false,
}: {
  label: string
  value: string
  fieldClass: string
  multiline?: boolean
}) {
  return (
    <div className={cn("min-w-0", fieldClass)}>
      <UiPasteLabel>{label}</UiPasteLabel>
      <div
        className={cn(
          "mt-0.5 flex gap-1",
          multiline ? "items-start" : "items-center",
        )}
      >
        <div
          className={cn(
            "min-w-0 flex-1 rounded-md border border-border bg-background px-1.5 text-[12px] text-foreground",
            multiline ? "min-h-[24px] py-0.5 leading-snug" : "truncate py-0.5",
          )}
        >
          {value}
        </div>
        <Check
          className={cn(
            "ob-check h-3 w-3 shrink-0",
            multiline ? "mt-0.5" : "",
            `${fieldClass}-check`,
          )}
          strokeWidth={2.5}
        />
      </div>
    </div>
  )
}

type PasteAutoField = {
  label: string
  value: string
  fieldClass: string
  multiline?: boolean
}

type PasteFieldLayout = {
  left?: PasteAutoField[]
  right?: PasteAutoField[]
  rows?: [PasteAutoField, PasteAutoField][]
  bottom?: PasteAutoField[]
}

function LinkedInPasteFlowLeft({
  name,
  headline,
  url,
  experience,
  education,
  location,
  dimClass,
  selectClass,
  kbdAClass,
  kbdCClass,
  copiedClass,
  cursorClass,
  showCursor = true,
}: {
  name: string
  headline: string
  url: string
  experience: string[]
  education?: string[]
  location?: string
  dimClass: string
  selectClass: string
  kbdAClass: string
  kbdCClass: string
  copiedClass: string
  cursorClass: string
  showCursor?: boolean
}) {
  return (
    <div className={`relative min-h-0 ${dimClass}`}>
      <LinkedInMini
        name={name}
        headline={headline}
        url={url}
        experience={experience}
        education={education}
        location={location}
      />
      {showCursor ? <WalkthroughCursor className={cn("ob-pflow-cursor left-6 top-8", cursorClass)} /> : null}
      <div
        className={`${selectClass} pointer-events-none absolute inset-0 rounded-lg bg-[#378ADD]/35`}
      />
      <span className={`${kbdAClass} ob-kbd ob-pflow-kbd-a absolute bottom-3 left-3`}>⌘A</span>
      <span className={`${kbdCClass} ob-kbd ob-pflow-kbd-c absolute bottom-3 left-3`}>⌘C</span>
      <span className={`${copiedClass} ob-toast absolute left-3 right-3 top-3 text-center`}>
        Copied to clipboard
      </span>
    </div>
  )
}

function LinkedInPasteFlowRight({
  title,
  rawPaste,
  autoFieldLayout,
  manualDropdowns,
  manualTextInput,
  manualCaptionClass,
  saveClass,
  savedClass,
  savedText,
}: {
  title: string
  rawPaste: string
  autoFieldLayout: PasteFieldLayout
  manualDropdowns?: ManualDropdownDef[]
  manualTextInput?: ManualTextInputDef
  manualCaptionClass?: string
  saveClass: string
  savedClass: string
  savedText: string
}) {
  return (
    <div
      className={cn(
        "ob-pflow-right-focus ob-s5-right-focus relative flex h-full min-h-0 flex-col rounded-lg border border-border bg-card p-2.5",
        manualDropdowns ? "overflow-visible" : "overflow-hidden",
      )}
    >
      <p className="shrink-0 text-[13px] font-semibold text-foreground">{title}</p>
      <UiPasteLabel>LinkedIn profile</UiPasteLabel>
      <div className="ob-pflow-paste-area ob-pflow-paste-scroll-hint ob-s5-paste-area relative mt-0.5 h-[60px] max-h-[60px] shrink-0 overflow-hidden rounded-md border border-border bg-muted/40 p-1.5 text-[10px] leading-tight text-muted-foreground">
        <p className="ob-pflow-paste-blob ob-s5-paste-blob whitespace-pre-wrap">{rawPaste}</p>
        <span className="ob-pflow-kbd-v ob-kbd ob-s5-kbd-v absolute bottom-1 right-1">⌘V</span>
      </div>
      <button
        type="button"
        className="ob-pflow-autofill-btn ob-s5-autofill-btn relative mt-1.5 shrink-0 overflow-hidden rounded-md bg-primary px-2.5 py-1 text-[11px] text-primary-foreground"
      >
        <span className="ob-pflow-autofill-label ob-s5-autofill-label">
          Auto-fill from LinkedIn
        </span>
        <span className="ob-pflow-autofill-loading ob-s5-autofill-loading absolute inset-0 flex items-center justify-center gap-1.5 bg-primary text-[11px] text-primary-foreground">
          <span className="inline-block h-3 w-3 animate-[ob-spin_0.875s_linear_infinite] rounded-full border-2 border-primary-foreground border-t-transparent" />
          Extracting...
        </span>
      </button>

      <div
        className={cn(
          "mt-1.5 flex min-h-0 flex-col gap-1",
          manualDropdowns ? "shrink-0 overflow-visible" : "min-h-0 flex-1 overflow-hidden",
        )}
      >
        {autoFieldLayout.rows ? (
          <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
            {autoFieldLayout.rows.map(([left, right]) => (
              <div key={`${left.label}-${right.label}`} className="grid grid-cols-2 gap-x-2">
                <UiFieldAutofill
                  label={left.label}
                  value={left.value}
                  fieldClass={left.fieldClass}
                  multiline={left.multiline}
                />
                <UiFieldAutofill
                  label={right.label}
                  value={right.value}
                  fieldClass={right.fieldClass}
                  multiline={right.multiline}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-0 shrink grid-cols-2 gap-x-2 gap-y-1 overflow-hidden">
            <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
              {autoFieldLayout.left?.map((f) => (
                <UiFieldAutofill
                  key={f.label}
                  label={f.label}
                  value={f.value}
                  fieldClass={f.fieldClass}
                  multiline={f.multiline}
                />
              ))}
            </div>
            <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
              {autoFieldLayout.right?.map((f) => (
                <UiFieldAutofill
                  key={f.label}
                  label={f.label}
                  value={f.value}
                  fieldClass={f.fieldClass}
                  multiline={f.multiline}
                />
              ))}
            </div>
          </div>
        )}
        {autoFieldLayout.bottom?.map((f) => (
          <UiFieldAutofill
            key={f.label}
            label={f.label}
            value={f.value}
            fieldClass={f.fieldClass}
            multiline={f.multiline ?? true}
          />
        ))}

        {manualDropdowns && manualCaptionClass ? (
          <div className="ob-s5-manual-section mt-1 shrink-0 overflow-visible opacity-0">
            <p className={`${manualCaptionClass} text-[11px] font-medium text-primary`}>
              Four quick fields to fill in yourself
            </p>
            <div className="mt-1 grid grid-cols-2 gap-2 overflow-visible">
              {manualDropdowns.map((field) => (
                <ManualDropdownField key={field.label} {...field} />
              ))}
              {manualTextInput ? <ManualTextInputField {...manualTextInput} /> : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className={cn("relative mt-1 shrink-0", manualDropdowns && "ob-s5-save-row opacity-0")}>
        <button
          type="button"
          className={`${saveClass} w-fit rounded-md bg-primary px-2.5 py-0.5 text-[11px] text-primary-foreground`}
        >
          Save
        </button>
        {manualDropdowns ? (
          <WalkthroughCursor className="ob-s5-save-cursor absolute left-6 top-0.5 opacity-0" />
        ) : null}
        <p
          className={`${savedClass} mt-1 rounded-md border border-[#639922]/30 bg-[#639922]/10 px-2 py-1 text-center text-[11px] font-medium text-[#639922]`}
        >
          {savedText}
        </p>
      </div>
    </div>
  )
}

function UiLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  )
}

function LinkedInMini({
  name,
  headline,
  url,
  experience,
  education,
  location,
  className,
}: {
  name: string
  headline: string
  url: string
  experience: string[]
  education?: string[]
  location?: string
  className?: string
}) {
  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-[#f3f2ef] ${className ?? ""}`}
    >
      <div className="border-b border-[#e0dfdc] bg-white px-3 py-1.5">
        <span className="text-[13px] font-bold text-[#0a66c2]">in</span>
        <span className="ml-2 text-[12px] text-muted-foreground">{url}</span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto bg-white p-3">
        <p className="text-[14px] font-semibold text-foreground">{name}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{headline}</p>
        {location && (
          <p className="mt-1 text-[12px] text-muted-foreground">{location}</p>
        )}
        <div className="mt-3 space-y-1.5 border-t border-border pt-2">
          {education && (
            <>
              <p className="text-[12px] font-semibold">Education</p>
              {education.map((e) => (
                <p key={e} className="rounded bg-muted/50 px-2 py-1 text-[12px] text-foreground">
                  {e}
                </p>
              ))}
            </>
          )}
          <p className={cn("text-[12px] font-semibold", education && "pt-1")}>Experience</p>
          {experience.map((e) => (
            <p key={e} className="rounded bg-muted/50 px-2 py-1 text-[12px] text-foreground">
              {e}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

function ActTitleCard({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-border bg-card px-8 text-center shadow-sm">
      <h2 className="text-[22px] font-semibold text-foreground">{title}</h2>
      <p className="mt-3 text-[15px] text-muted-foreground">{subtitle}</p>
    </div>
  )
}

export function SceneWelcome() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-[28px] font-bold text-primary-foreground">
          R
        </div>
        <span className="text-[32px] font-semibold tracking-tight">Rapport</span>
      </div>
      <p className="max-w-md text-[22px] font-medium text-foreground">
        Your personal CRM for high-stakes networking
      </p>
      <p className="max-w-lg text-[15px] text-muted-foreground">
        Built for MBA students and career switchers doing serious outreach.
      </p>
    </div>
  )
}

export function SceneAct1Title() {
  return (
    <ActTitleCard
      title="Act 1: Setting up Rapport"
      subtitle="Takes about 2 minutes the first time."
    />
  )
}

export function SceneProfileSetup() {
  return (
    <div className="grid h-full min-h-0 grid-cols-[2fr_3fr] gap-4 overflow-visible">
      <LinkedInPasteFlowLeft
        name={OB_USER.name}
        headline={OB_USER.headline}
        url={OB_USER.linkedinUrl}
        experience={["Wharton School · MBA Candidate", "Goldman Sachs · Tech M&A · 4 yrs"]}
        education={[
          "Wharton School of Business · MBA Candidate",
          "UC Berkeley · BA Economics",
        ]}
        dimClass=""
        selectClass="ob-s2-select"
        kbdAClass="ob-s2-kbd-a"
        kbdCClass="ob-s2-kbd-c"
        copiedClass="ob-s2-copied"
        cursorClass="ob-s2-cursor"
        showCursor={true}
      />
      <Scene2PreferencesProfilePanel />
    </div>
  )
}

export function SceneVoiceSetup() {
  return <Scene3PreferencesVoicePanel />
}

export function ScenePreferencesSummary() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-[13px] font-semibold">Preferences</p>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-border px-3 py-2">
          <Check className="ob-check h-4 w-4" strokeWidth={2.5} />
          <div>
            <p className="text-[12px] font-medium">{OB_USER.name}</p>
            <p className="text-[12px] text-muted-foreground">
              {OB_USER.role} · {OB_USER.company}
            </p>
          </div>
        </div>
        <div className="mt-3 rounded-md border border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#639922]" />
            <p className="text-[12px] font-medium">{OB_USER.voiceProfile}</p>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">2 samples saved</p>
        </div>
      </div>
      <p className="text-center text-[22px] font-semibold text-foreground">
        You are set up. Now let&apos;s add your first contact.
      </p>
    </div>
  )
}

export function SceneAct2Title() {
  return (
    <ActTitleCard title="Act 2: Using Rapport" subtitle="Your daily workflow." />
  )
}

export function SceneAddContact() {
  const c = OB_CONTACTS.priya
  const autoFieldLayout: PasteFieldLayout = {
    left: [
      { label: "Name", value: c.name, fieldClass: "ob-s5-field-1" },
      { label: "Company", value: c.company, fieldClass: "ob-s5-field-2" },
      { label: "City", value: c.city, fieldClass: "ob-s5-field-4" },
    ],
    right: [
      { label: "Role", value: c.role, fieldClass: "ob-s5-field-3" },
      { label: "University", value: c.university, fieldClass: "ob-s5-field-5" },
      { label: "Mutual connections", value: c.mutuals, fieldClass: "ob-s5-field-6" },
    ],
  }
  const manualDropdowns: ManualDropdownDef[] = [
    {
      label: "Goal",
      selected: "Informational call",
      options: ["Informational call", "Referral", "Mentorship"],
      classPrefix: "ob-s5-dd-goal",
    },
    {
      label: "Source",
      selected: "LinkedIn",
      options: ["LinkedIn", "Warm intro", "Conference", "Personal", "Other"],
      classPrefix: "ob-s5-dd-source",
    },
    {
      label: "Connection type",
      selected: "Cold",
      options: ["Hot", "Warm", "Cold"],
      classPrefix: "ob-s5-dd-type",
    },
  ]
  const manualTextInput: ManualTextInputDef = {
    label: "Email",
    text: S5_EMAIL_TEXT,
    classPrefix: "ob-s5-email",
    typingStartDelay: S5_EMAIL_TYPING_START,
    charMs: S5_EMAIL_CHAR_MS,
  }

  return (
    <div className="relative h-full min-h-0 overflow-visible">
      <div className="grid h-full min-h-0 grid-cols-2 gap-4 overflow-visible">
        <LinkedInPasteFlowLeft
          name={c.name}
          headline={c.title}
          url={c.linkedinUrl}
          location={c.city}
          experience={[`${c.company} · ${c.role}`]}
          education={["IIM Ahmedabad · MBA", "BITS Pilani · BE Computer Science"]}
          dimClass="ob-s5-left-dim"
          selectClass="ob-s5-select"
          kbdAClass="ob-s5-kbd-a"
          kbdCClass="ob-s5-kbd-c"
          copiedClass="ob-s5-copied"
          cursorClass="ob-s5-cursor"
        />
        <LinkedInPasteFlowRight
          title="Add contact"
          rawPaste={OB_RAW_LINKEDIN_PRIYA}
          autoFieldLayout={autoFieldLayout}
          manualDropdowns={manualDropdowns}
          manualTextInput={manualTextInput}
          manualCaptionClass="ob-s5-manual-caption"
          saveClass="ob-s5-save"
          savedClass="ob-s5-saved"
          savedText="Contact added"
        />
      </div>

      <div className="ob-s5-kanban-card pointer-events-none absolute bottom-2 left-[4%] w-[18%] rounded-md border border-border bg-card p-2 shadow-sm">
        <p
          className="truncate text-[12px] font-medium"
          style={{ borderLeft: `3px solid ${STAGE_BORDER.gray}`, paddingLeft: 6 }}
        >
          {c.name}
        </p>
        <p className="pl-[9px] text-[11px] text-muted-foreground">Not contacted</p>
      </div>
    </div>
  )
}

const PIPELINE_STAGES = [
  { title: "Not contacted", color: STAGE_BORDER.gray },
  { title: "In progress", color: STAGE_BORDER.blue },
  { title: "Responded", color: STAGE_BORDER.amber },
  { title: "Met / Connected", color: STAGE_BORDER.green },
] as const

function DraftLineReveal({
  text,
  lineClass,
}: {
  text: string
  lineClass: string
}) {
  return <p className={cn("leading-snug", lineClass)}>{text}</p>
}

export function SceneDraftOutreach() {
  const c = OB_CONTACTS.priya
  const inputClassName =
    "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[11px] text-foreground"

  return (
    <div className="grid h-full min-h-0 grid-cols-2 gap-4 p-4">
      <div className="flex items-center justify-center">
        <div className="w-full max-w-[240px] rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-[15px] font-semibold text-foreground">
              {getInitials(c.name)}
            </div>
            <p className="mt-3 text-[14px] font-semibold text-foreground">{c.name}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {c.role}, {c.company}
            </p>
            <button
              type="button"
              className="ob-s7-panel-btn mt-5 w-full rounded-md bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground"
            >
              Draft outreach message
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 items-center justify-center">
        <div className="flex h-full max-h-full w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card p-4 shadow-lg">
          <h2 className="shrink-0 text-sm font-semibold text-foreground">
            Draft outreach for {c.name}
          </h2>

          <div className="relative mt-3 min-h-[320px] flex-1">
            <div className="ob-s7-phase-setup absolute inset-0 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="ob-s7-email-selected flex flex-col items-center justify-center gap-1.5 rounded-lg border border-[#378ADD] bg-[#378ADD]/10 px-2 py-3 text-[11px] font-medium text-[#378ADD] ring-1 ring-[#378ADD]/25">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 py-3 text-[11px] font-medium text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>LinkedIn message</span>
                </div>
              </div>
              <DraftVoiceProfileDropdown />
              <button
                type="button"
                className="ob-s7-generate mt-auto w-fit rounded-md bg-primary px-4 py-2 text-[12px] font-medium text-primary-foreground opacity-0"
              >
                Generate
              </button>
            </div>

            <div className="ob-s7-phase-loading absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="flex gap-1">
                <span className="ob-loading-dot h-2 w-2 rounded-full bg-primary" />
                <span className="ob-loading-dot h-2 w-2 rounded-full bg-primary" />
                <span className="ob-loading-dot h-2 w-2 rounded-full bg-primary" />
              </div>
              <p className="mt-3 text-[12px] font-medium text-foreground">Drafting in your voice...</p>
            </div>

            <div className="ob-s7-phase-draft absolute inset-0 flex flex-col gap-2 overflow-hidden">
              <label className="shrink-0 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground">Subject</span>
                <div className={cn(inputClassName, "overflow-hidden")}>
                  <span className="ob-s7-subject inline-block whitespace-nowrap">{OB_DRAFT_SUBJECT}</span>
                </div>
              </label>
              <label className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                <span className="shrink-0 text-[11px] font-medium text-muted-foreground">Body</span>
                <div className={cn(inputClassName, "overflow-hidden py-2")}>
                  <div className="space-y-1.5 text-[11px] leading-snug">
                    {OB_DRAFT_BODY_LINES.map((line, i) => (
                      <DraftLineReveal key={line} text={line} lineClass={`ob-s7-line-${i + 1}`} />
                    ))}
                  </div>
                </div>
              </label>
              <div className="mt-auto flex shrink-0 justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="ob-s7-copy rounded-md border border-input bg-background px-3 py-1.5 text-[11px] font-medium"
                >
                  Copy to clipboard
                </button>
                <span className="ob-s7-copied self-center text-[11px] font-medium text-emerald-600">
                  Copied!
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ScenePipelineDrag() {
  const priya = OB_CONTACTS.priya

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="relative w-full max-w-3xl">
        <div className="grid grid-cols-4 gap-3">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.title}>
              <p
                className="border-b-2 pb-2 text-[11px] font-medium text-foreground"
                style={{ borderBottomColor: stage.color }}
              >
                {stage.title}
              </p>
              <div className="mt-3 min-h-[100px] rounded-md bg-muted/15" />
            </div>
          ))}
        </div>

        <div className="ob-s8-priya-track pointer-events-none absolute bottom-0 left-0 top-[34px] w-[calc((100%-2.25rem)/4)]">
          <div className="ob-s8-priya rounded-md border border-border bg-card p-2.5 shadow-sm">
            <p className="truncate text-[12px] font-medium">{priya.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{priya.title}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FollowUpCardMock({
  name,
  detail,
  warnClass,
  children,
}: {
  name: string
  detail: string
  warnClass: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-md border border-border bg-card p-2 shadow-sm">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium">{name}</p>
          <p className="text-[10px] leading-snug text-muted-foreground">{detail}</p>
        </div>
        <AlertTriangle className={cn("h-3.5 w-3.5 shrink-0 text-[#EF9F27]", warnClass)} strokeWidth={2} />
      </div>
      {children}
    </div>
  )
}

export function SceneFollowUpsMultiple() {
  const followCols = [
    { title: "Not yet contacted", contact: OB_CONTACTS.james, zoom: true },
    { title: "Awaiting response", contact: OB_CONTACTS.alex, zoom: false },
    { title: "Ready to reconnect", contact: OB_CONTACTS.marcus, zoom: false },
  ] as const

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="ob-s10-board w-full max-w-3xl rounded-lg border border-border bg-card p-4">
        <p className="mb-3 text-[13px] font-semibold text-foreground">Follow-ups</p>
        <div className="grid grid-cols-3 gap-3">
          {followCols.map((col) => (
            <div
              key={col.title}
              className={cn("min-w-0", col.zoom && "ob-s10-james-col relative z-10")}
            >
              <p className="truncate border-b-2 border-[#888780] pb-2 text-[11px] font-medium text-foreground">
                {col.title}
              </p>
              <div className="mt-3 min-h-[120px]">
                <FollowUpCardMock
                  name={col.contact.name}
                  detail={col.contact.followUpDetail}
                  warnClass="ob-s10-warn"
                >
                  {col.zoom ? (
                    <button
                      type="button"
                      className="ob-s10-james-draft-btn mt-2 w-full rounded-md bg-primary px-2 py-1.5 text-[11px] font-medium text-primary-foreground"
                    >
                      Draft outreach message
                    </button>
                  ) : null}
                </FollowUpCardMock>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SceneCalendarIntegration() {
  const priya = OB_CONTACTS.priya
  const james = OB_CONTACTS.james
  const jamesSubtitle = "Founder at Bloom"

  return (
    <div className="relative h-full overflow-hidden bg-background">
      <div className="ob-s11-main flex h-full items-center justify-center px-5 py-6">
        <div className="ob-s11-stack relative w-full max-w-3xl">
          <div className="ob-s11-banner-slot-ex1 shrink-0 overflow-hidden">
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
              <IconCalendar className="h-5 w-5 shrink-0 text-[#378ADD]" stroke={1.75} />
              <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-foreground">
                {james.name} · Strategy call at 3:00 PM today · Move to Responded?
              </p>
              <button
                type="button"
                className="ob-s11-confirm-ex1 shrink-0 rounded-md bg-primary px-3.5 py-1.5 text-[12px] font-medium text-primary-foreground"
              >
                Confirm
              </button>
              <button
                type="button"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="ob-s11-gap-ex1 shrink-0" aria-hidden />

          <div className="ob-s11-banner-slot-ex2 shrink-0 overflow-hidden">
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
              <IconCalendar className="h-5 w-5 shrink-0 text-[#378ADD]" stroke={1.75} />
              <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-foreground">
                {priya.name} · Intro call ended 1 hour ago · Move to Met / Connected?
              </p>
              <button
                type="button"
                className="ob-s11-confirm-ex2 shrink-0 rounded-md bg-primary px-3.5 py-1.5 text-[12px] font-medium text-primary-foreground"
              >
                Confirm
              </button>
              <button
                type="button"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="ob-s11-gap-ex2 shrink-0" aria-hidden />

          <div className="ob-s11-kanban relative min-h-[220px]">
            <div className="grid grid-cols-4 gap-3">
              {PIPELINE_STAGES.map((stage) => (
                <div key={stage.title}>
                  <p
                    className="border-b-2 pb-2.5 text-[13px] font-semibold text-foreground"
                    style={{ borderBottomColor: stage.color }}
                  >
                    {stage.title}
                  </p>
                  <div className="mt-3 min-h-[168px] rounded-md bg-muted/15" />
                </div>
              ))}
            </div>

            <div className="ob-s11-james-track pointer-events-none absolute left-0 top-[2.625rem] z-10 w-[calc((100%-2.25rem)/4)]">
              <div
                className="ob-s11-james relative rounded-md border border-border bg-card p-3 shadow-sm"
                style={{ borderLeft: `3px solid ${STAGE_BORDER.blue}` }}
              >
                <p className="truncate text-[13px] font-medium">{james.name}</p>
                <p className="truncate text-[12px] text-muted-foreground">{jamesSubtitle}</p>
              </div>
            </div>

            <div className="ob-s11-priya-track pointer-events-none absolute left-0 top-[2.625rem] z-10 w-[calc((100%-2.25rem)/4)]">
              <div
                className="ob-s11-priya relative rounded-md border border-border bg-card p-3 shadow-sm"
                style={{ borderLeft: `3px solid ${STAGE_BORDER.amber}` }}
              >
                <p className="truncate text-[13px] font-medium">{priya.name}</p>
                <p className="truncate text-[12px] text-muted-foreground">{priya.title}</p>
                <Check
                  className="ob-s11-priya-check ob-check absolute -right-1 -top-1 h-4 w-4 rounded-full bg-background opacity-0"
                  strokeWidth={2.5}
                />
              </div>
            </div>
          </div>

          <WalkthroughCursor className="ob-s11-cursor absolute z-20 opacity-0" />
        </div>
      </div>
    </div>
  )
}

export const WALKTHROUGH_SCENES: WalkthroughSceneDef[] = [
  {
    id: "welcome",
    actLabel: null,
    caption: "",
    static: true,
    durationMs: 0,
    Component: SceneWelcome,
  },
  {
    id: "act1-title",
    actLabel: "Act 1: Setting up Rapport",
    caption: "",
    static: true,
    durationMs: 0,
    Component: SceneAct1Title,
  },
  {
    id: "profile",
    actLabel: "Act 1: Setting up Rapport",
    caption: "Paste your LinkedIn once. Rapport fills in everything automatically.",
    static: false,
    durationMs: 12500,
    Component: SceneProfileSetup,
  },
  {
    id: "voice",
    actLabel: "Act 1: Setting up Rapport",
    caption: "",
    captionPhases: [
      {
        atMs: S3_CAPTION_MID_MS,
        text: "Create different profiles for different contexts.",
      },
      {
        atMs: S3_CAPTION_FINAL_MS,
        text: "You can also add LinkedIn message samples for even more personalized outreach.",
      },
    ],
    static: false,
    durationMs: S3_DURATION_MS,
    Component: SceneVoiceSetup,
  },
  {
    id: "prefs-summary",
    actLabel: "Act 1: Setting up Rapport",
    caption: "",
    static: true,
    durationMs: 0,
    Component: ScenePreferencesSummary,
  },
  {
    id: "act2-title",
    actLabel: "Act 2: Using Rapport",
    caption: "",
    static: true,
    durationMs: 0,
    Component: SceneAct2Title,
  },
  {
    id: "contact",
    actLabel: "Act 2: Using Rapport",
    caption: "One paste. Rapport handles the rest.",
    captionPhases: [
      {
        atMs: 9500,
        text: "Four quick fields to fill in yourself. Everything else is handled automatically.",
      },
    ],
    static: false,
    durationMs: S5_DURATION_MS,
    Component: SceneAddContact,
  },
  {
    id: "draft",
    actLabel: "Act 2: Using Rapport",
    caption: "Ready to reach out? Rapport writes in your voice. Copy and send.",
    static: false,
    durationMs: S7_DURATION_MS,
    Component: SceneDraftOutreach,
  },
  {
    id: "pipeline-drag",
    actLabel: "Act 2: Using Rapport",
    caption: "After sending your message, move Priya to In progress",
    captionPhases: [
      { atMs: 0, text: "After sending your message, move Priya to In progress" },
      { atMs: 4000, text: "When she responds, move her to Responded" },
      { atMs: 6500, text: "After your call, move her to Met / Connected" },
    ],
    static: false,
    durationMs: 9000,
    Component: ScenePipelineDrag,
  },
  {
    id: "calendar-integration",
    actLabel: "Act 2: Using Rapport",
    caption:
      "Rapport detects calendar events and prompts you to keep your pipeline up to date.",
    static: false,
    durationMs: S11_DURATION_MS,
    Component: SceneCalendarIntegration,
  },
  {
    id: "followups-multiple",
    actLabel: "Act 2: Using Rapport",
    caption:
      "Rapport flags every contact that needs attention, so nothing falls through the cracks.",
    static: false,
    durationMs: 6500,
    Component: SceneFollowUpsMultiple,
  },
]
