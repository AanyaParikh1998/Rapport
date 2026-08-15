"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { OB_RAW_LINKEDIN_SARAH, OB_USER } from "@/components/onboarding/persona"

export { Scene3PreferencesVoicePanel, S3_DURATION_MS } from "@/components/onboarding/scene3-voice-panel"

export const OB_PREF_INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export const OB_PREF_TEXTAREA_CLASS = `${OB_PREF_INPUT_CLASS} min-h-[140px] resize-y`

const PREFERENCES_TABS = [
  { id: "profile" as const, label: "My profile" },
  { id: "voice" as const, label: "My Voice" },
]

export function PreferencesChrome({ activeTab }: { activeTab: "profile" | "voice" }) {
  return (
    <header className="mb-1 shrink-0 border-b border-border pb-1.5">
      <h1 className="text-sm font-semibold text-foreground">Preferences</h1>
      <p className="text-[10px] text-muted-foreground">
        Your profile and writing style for outreach drafts
      </p>
      <div className="mt-1.5 flex border-b border-border">
        {PREFERENCES_TABS.map((tab) => (
          <span
            key={tab.id}
            className={cn(
              "flex-1 pb-1.5 pt-0.5 text-center text-[11px] font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-[#378ADD] text-foreground"
                : "text-muted-foreground",
            )}
          >
            {tab.label}
          </span>
        ))}
      </div>
    </header>
  )
}

function Scene2FieldAutofill({
  label,
  value,
  fieldClass,
  singleLine = false,
}: {
  label: string
  value: string
  fieldClass: string
  singleLine?: boolean
}) {
  const inputClass =
    "w-full min-w-0 rounded-md border border-input bg-background px-2 py-[5px] text-[12px] text-foreground"

  return (
    <label className={cn("flex min-w-0 flex-col opacity-0", fieldClass)}>
      <span className="mb-0.5 text-[10px] font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {singleLine ? (
          <input
            readOnly
            value={value}
            className={cn(inputClass, "flex-1 truncate")}
          />
        ) : (
          <input readOnly value={value} className={cn(inputClass, "flex-1")} />
        )}
        <Check
          className={`${fieldClass}-check h-3 w-3 shrink-0 text-emerald-600`}
          strokeWidth={2.5}
        />
      </div>
    </label>
  )
}

const SCENE2_FIELD_ROWS = [
  [
    { label: "Full name", value: OB_USER.name, fieldClass: "ob-s2-field-1" },
    {
      label: "Current company or school",
      value: OB_USER.company,
      fieldClass: "ob-s2-field-2",
    },
  ],
  [
    { label: "Role or program", value: OB_USER.role, fieldClass: "ob-s2-field-3" },
    {
      label: "Graduate university",
      value: OB_USER.grad,
      fieldClass: "ob-s2-field-6",
    },
  ],
  [
    { label: "Location", value: OB_USER.location, fieldClass: "ob-s2-field-4" },
    {
      label: "Undergraduate university",
      value: OB_USER.undergrad,
      fieldClass: "ob-s2-field-5",
    },
  ],
] as const

export function Scene2PreferencesProfilePanel() {
  return (
    <div className="ob-s2-panel relative flex h-full min-h-0 flex-col overflow-visible rounded-lg border border-border bg-background p-2">
      <PreferencesChrome activeTab="profile" />

      <form className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-visible">
        <label className="flex shrink-0 flex-col gap-0.5">
          <span className="text-[10px] font-medium text-muted-foreground">LinkedIn profile</span>
          <div className="flex gap-1.5">
            <div className="relative min-w-0 flex-1">
              <div className="ob-s2-paste-area ob-pflow-paste-scroll-hint relative h-[50px] max-h-[50px] overflow-hidden rounded-md border border-input bg-background px-2 py-1 text-[10px] leading-tight text-muted-foreground">
                <p className="ob-s2-paste-blob ob-pflow-paste-blob whitespace-pre-wrap opacity-0">
                  {OB_RAW_LINKEDIN_SARAH}
                </p>
                <span className="ob-s2-kbd-v ob-kbd ob-pflow-kbd-v absolute bottom-1 right-1 opacity-0">
                  ⌘V
                </span>
              </div>
            </div>
            <button
              type="button"
              className="ob-s2-autofill-btn relative shrink-0 self-start overflow-hidden whitespace-nowrap rounded-md border border-input bg-background px-2 py-1 text-[10px] font-medium text-foreground"
            >
              <span className="ob-s2-autofill-label">Auto-fill from LinkedIn</span>
              <span className="ob-s2-autofill-loading absolute inset-0 flex items-center justify-center gap-1.5 bg-background text-[10px] text-foreground opacity-0">
                <span className="inline-block h-3 w-3 animate-[ob-spin_0.875s_linear_infinite] rounded-full border-2 border-foreground border-t-transparent" />
                Extracting...
              </span>
            </button>
          </div>
        </label>

        <div className="flex shrink-0 flex-col gap-1.5 overflow-visible">
          {SCENE2_FIELD_ROWS.map((row) => (
            <div key={row[0].fieldClass} className="grid grid-cols-2 gap-1.5">
              {row.map((field) => (
                <Scene2FieldAutofill key={field.label} {...field} />
              ))}
            </div>
          ))}
          <Scene2FieldAutofill
            label="Professional background"
            value={OB_USER.background}
            fieldClass="ob-s2-field-8"
            singleLine
          />
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <button
            type="button"
            className="ob-s2-save rounded-md bg-primary px-3 py-1 text-[10px] font-medium text-primary-foreground"
          >
            Save
          </button>
          <span className="ob-s2-saved ob-toast text-[10px] font-medium opacity-0">
            Profile saved
          </span>
        </div>
      </form>
    </div>
  )
}
