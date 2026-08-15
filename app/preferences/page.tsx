"use client"

import { Suspense, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Sidebar } from "@/components/sidebar"
import { CalendarIntegrationSection } from "@/components/calendar-integration-section"
import { MyVoiceSection } from "@/components/my-voice-section"
import { Button } from "@/components/ui/button"
import {
  EMPTY_USER_PROFILE_INPUT,
  fetchUserProfile,
  saveUserProfile,
  userProfileToInput,
  type UserProfileInput,
} from "@/lib/user-profile"

type PreferencesTab = "profile" | "voice"

const PREFERENCES_TABS: { id: PreferencesTab; label: string }[] = [
  { id: "profile", label: "My profile" },
  { id: "voice", label: "My Voice" },
]

const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const textareaClassName = `${inputClassName} min-h-[140px] resize-y`

export default function PreferencesPage() {
  const [activeTab, setActiveTab] = useState<PreferencesTab>("profile")
  const [form, setForm] = useState<UserProfileInput>(EMPTY_USER_PROFILE_INPUT)
  const [linkedinText, setLinkedinText] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autofilling, setAutofilling] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [autofillError, setAutofillError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchUserProfile()
      .then((profile) => {
        if (!cancelled) {
          setForm(profile ? userProfileToInput(profile) : EMPTY_USER_PROFILE_INPUT)
          setLoadError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load profile")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function updateField<K extends keyof UserProfileInput>(key: K, value: UserProfileInput[K]) {
    setSaved(false)
    setSaveError(null)
    setForm((current) => ({ ...current, [key]: value }))
  }

  function getErrorMessage(err: unknown) {
    return err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String(err.message)
        : "Something went wrong"
  }

  async function handleAutofill() {
    if (!linkedinText.trim()) {
      setAutofillError("Paste LinkedIn profile text first.")
      return
    }

    setAutofillError(null)
    setAutofilling(true)
    setSaved(false)

    try {
      const response = await fetch("/api/parse-user-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: linkedinText }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to parse LinkedIn profile")
      }

      setForm((current) => ({
        ...current,
        fullName: data.full_name || current.fullName,
        currentCompany: data.current_company || current.currentCompany,
        role: data.role || current.role,
        location: data.location || current.location,
        undergraduateUniversity:
          data.undergraduate_university || current.undergraduateUniversity,
        graduateUniversity: data.graduate_university || current.graduateUniversity,
        background: data.background || current.background,
      }))
    } catch (err) {
      setAutofillError(getErrorMessage(err))
    } finally {
      setAutofilling(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaved(false)

    try {
      await saveUserProfile(form)
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="shrink-0 border-b border-border px-5 pt-4">
          <div>
            <h1 className="text-sm font-semibold text-foreground">Preferences</h1>
            <p className="text-[11px] text-muted-foreground">
              Your profile and writing style for outreach drafts
            </p>
          </div>

          <div className="mt-4">
            <Suspense
              fallback={
                <section className="mb-4 max-w-xl rounded-lg border border-border bg-card p-4">
                  <p className="text-[12px] text-muted-foreground">Loading integrations...</p>
                </section>
              }
            >
              <CalendarIntegrationSection />
            </Suspense>
          </div>

          <div className="mt-4 flex border-b border-border">
            {PREFERENCES_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 pb-2.5 pt-1 text-[12px] font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-b-2 border-[#378ADD] text-foreground"
                    : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl flex-1 p-5">
          {activeTab === "profile" ? (
            <section>
              <p className="mb-5 text-[11px] text-muted-foreground">
                Your details are used when drafting outreach messages
              </p>

            {loadError ? (
              <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                {loadError}
              </p>
            ) : null}

            {loading ? (
              <p className="text-[13px] text-muted-foreground">Loading profile...</p>
            ) : (
              <form
                className="flex max-w-xl flex-col gap-5"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleSave()
                }}
              >
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    LinkedIn profile
                  </span>
                  <div className="flex gap-2">
                    <textarea
                      value={linkedinText}
                      onChange={(event) => setLinkedinText(event.target.value)}
                      placeholder="Paste your LinkedIn profile text here (Cmd+A on your LinkedIn page, then Cmd+C)"
                      rows={6}
                      className={textareaClassName}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 self-start whitespace-nowrap"
                      onClick={() => void handleAutofill()}
                      disabled={saving || autofilling}
                    >
                      {autofilling ? "Filling..." : "Auto-fill from LinkedIn"}
                    </Button>
                  </div>
                </label>

                {autofillError ? (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                    {autofillError}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3">
                  <Field
                    label="Full name"
                    value={form.fullName}
                    onChange={(value) => updateField("fullName", value)}
                    placeholder="Aanya Parikh"
                  />
                  <Field
                    label="Current company or school"
                    value={form.currentCompany}
                    onChange={(value) => updateField("currentCompany", value)}
                    placeholder="Wharton School"
                  />
                  <Field
                    label="Role or program"
                    value={form.role}
                    onChange={(value) => updateField("role", value)}
                    placeholder="MBA candidate"
                  />
                  <Field
                    label="Location"
                    value={form.location}
                    onChange={(value) => updateField("location", value)}
                    placeholder="Philadelphia, PA"
                  />
                  <Field
                    label="Undergraduate university"
                    value={form.undergraduateUniversity}
                    onChange={(value) => updateField("undergraduateUniversity", value)}
                    placeholder="University of Michigan"
                  />
                  <Field
                    label="Graduate university"
                    value={form.graduateUniversity}
                    onChange={(value) => updateField("graduateUniversity", value)}
                    placeholder="Wharton School"
                  />
                  <Field
                    label="LinkedIn URL"
                    value={form.linkedinUrl}
                    onChange={(value) => updateField("linkedinUrl", value)}
                    placeholder="Paste LinkedIn profile URL here e.g. linkedin.com/in/firstname-lastname"
                  />
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Professional background
                    </span>
                    <textarea
                      value={form.background}
                      onChange={(event) => updateField("background", event.target.value)}
                      rows={4}
                      className={`${inputClassName} min-h-[96px] resize-y`}
                      placeholder="5 years in private equity and fintech, including supply chain finance"
                    />
                  </label>
                </div>

                {saveError ? (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                    {saveError}
                  </p>
                ) : null}

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={saving || autofilling}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  {saved ? (
                    <span className="text-[12px] font-medium text-emerald-600">Saved</span>
                  ) : null}
                </div>
              </form>
            )}
            </section>
          ) : (
            <section>
              <MyVoiceSection />
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
    </label>
  )
}
