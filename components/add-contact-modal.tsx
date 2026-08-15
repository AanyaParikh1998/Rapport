"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createContact, type NewContactInput } from "@/lib/contacts"
import type { Contact } from "@/lib/data"

const GOAL_OPTIONS = ["Informational call", "Referral", "Mentorship"] as const
const SOURCE_OPTIONS = ["LinkedIn", "Warm intro", "Conference", "Personal", "Other"] as const
const CONNECTION_TYPE_OPTIONS = ["Cold", "Warm", "Hot"] as const

const EMPTY_FORM: NewContactInput = {
  name: "",
  company: "",
  role: "",
  city: "",
  undergraduateUniversity: "",
  graduateUniversity: "",
  goal: GOAL_OPTIONS[0],
  source: SOURCE_OPTIONS[0],
  connectionType: CONNECTION_TYPE_OPTIONS[0],
  notes: "",
  linkedinUrl: "",
  email: "",
  mutualCount: null,
}

type AutofillFieldKey =
  | "name"
  | "company"
  | "role"
  | "city"
  | "undergraduateUniversity"
  | "graduateUniversity"
  | "mutualCount"

const FIELD_LABEL_CLASS = "text-[11px] font-medium text-muted-foreground"
const SECTION_LABEL_CLASS =
  "text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
const INPUT_BASE_CLASS_NAME =
  "w-full rounded-md border px-3 py-2 text-[13px] text-foreground outline-none"
const INPUT_NEUTRAL_CLASS_NAME = cn(
  INPUT_BASE_CLASS_NAME,
  "border-input bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
)
const INPUT_MANUAL_CLASS_NAME = cn(
  INPUT_BASE_CLASS_NAME,
  "border-[#378ADD]/50 bg-[#F0F7FF] focus-visible:border-[#378ADD] focus-visible:ring-3 focus-visible:ring-[#378ADD]/20",
)
const INPUT_AUTOFILLED_CLASS_NAME = cn(
  INPUT_BASE_CLASS_NAME,
  "border-[#639922]/40 bg-background focus-visible:border-[#639922] focus-visible:ring-3 focus-visible:ring-[#639922]/20",
)

type LinkedInParseResponse = {
  name?: string
  company?: string
  role?: string
  city?: string
  undergraduate_university?: string
  graduate_university?: string
  mutual_count?: number | null
}

function getAutofilledFieldKeys(data: LinkedInParseResponse): Set<AutofillFieldKey> {
  const keys = new Set<AutofillFieldKey>()

  if (data.name?.trim()) keys.add("name")
  if (data.company?.trim()) keys.add("company")
  if (data.role?.trim()) keys.add("role")
  if (data.city?.trim()) keys.add("city")
  if (data.undergraduate_university?.trim()) keys.add("undergraduateUniversity")
  if (data.graduate_university?.trim()) keys.add("graduateUniversity")
  if (typeof data.mutual_count === "number") keys.add("mutualCount")

  return keys
}

export function AddContactModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (contact: Contact) => void
}) {
  const [form, setForm] = useState<NewContactInput>(EMPTY_FORM)
  const [linkedinText, setLinkedinText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [autofilling, setAutofilling] = useState(false)
  const [autofillError, setAutofillError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasAutofilled, setHasAutofilled] = useState(false)
  const [autofilledFieldKeys, setAutofilledFieldKeys] = useState<Set<AutofillFieldKey>>(
    new Set(),
  )

  if (!open) return null

  function updateField<K extends keyof NewContactInput>(key: K, value: NewContactInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setLinkedinText("")
    setAutofillError(null)
    setError(null)
    setHasAutofilled(false)
    setAutofilledFieldKeys(new Set())
  }

  function handleClose() {
    if (submitting || autofilling) return
    resetForm()
    onClose()
  }

  function getErrorMessage(err: unknown) {
    return err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String(err.message)
        : "Something went wrong"
  }

  function showAutofillCheck(field: AutofillFieldKey): boolean {
    return hasAutofilled && autofilledFieldKeys.has(field)
  }

  function autofillInputClass(field: AutofillFieldKey): string {
    return showAutofillCheck(field) ? INPUT_AUTOFILLED_CLASS_NAME : INPUT_NEUTRAL_CLASS_NAME
  }

  async function handleAutofill() {
    if (!linkedinText.trim()) {
      setAutofillError("Paste LinkedIn profile text first.")
      return
    }

    setAutofillError(null)
    setAutofilling(true)

    try {
      const response = await fetch("/api/linkedin-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: linkedinText }),
      })

      const data = (await response.json()) as LinkedInParseResponse & { error?: string }

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to parse LinkedIn profile")
      }

      setForm((current) => ({
        ...current,
        name: data.name || current.name,
        company: data.company || current.company,
        role: data.role || current.role,
        city: data.city || current.city,
        undergraduateUniversity:
          data.undergraduate_university || current.undergraduateUniversity,
        graduateUniversity: data.graduate_university || current.graduateUniversity,
        mutualCount:
          typeof data.mutual_count === "number" ? data.mutual_count : current.mutualCount,
      }))
      setAutofilledFieldKeys(getAutofilledFieldKeys(data))
      setHasAutofilled(true)
    } catch (err) {
      setAutofillError(getErrorMessage(err))
    } finally {
      setAutofilling(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!form.name.trim() || !form.company.trim() || !form.role.trim()) {
      setError("Auto-fill from LinkedIn to populate name, company, and role.")
      return
    }

    setSubmitting(true)

    try {
      const contact = await createContact(form)
      resetForm()
      onCreated(contact)
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
        aria-label="Close add contact modal"
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-contact-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="add-contact-title" className="text-sm font-semibold text-foreground">
              Add contact
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Paste a LinkedIn profile to auto-fill, then complete the remaining fields.
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <FormField label="LinkedIn profile">
              <textarea
                value={linkedinText}
                onChange={(event) => setLinkedinText(event.target.value)}
                placeholder="Paste LinkedIn profile text here."
                rows={6}
                className={cn(INPUT_NEUTRAL_CLASS_NAME, "min-h-[140px] resize-y")}
              />
            </FormField>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleAutofill}
              disabled={submitting || autofilling}
            >
              {autofilling ? "Filling..." : "Auto-fill from LinkedIn"}
            </Button>
          </div>

          {autofillError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
              {autofillError}
            </p>
          ) : null}

          {hasAutofilled ? (
            <section className="flex flex-col gap-3">
              <p className={SECTION_LABEL_CLASS}>From LinkedIn</p>

              <FormField label="Name" showCheck={showAutofillCheck("name")}>
                <input
                  required
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className={autofillInputClass("name")}
                  placeholder="Maya Chen"
                />
              </FormField>

              <FormField label="Company" showCheck={showAutofillCheck("company")}>
                <input
                  required
                  value={form.company}
                  onChange={(event) => updateField("company", event.target.value)}
                  className={autofillInputClass("company")}
                  placeholder="Stripe"
                />
              </FormField>

              <FormField label="Role" showCheck={showAutofillCheck("role")}>
                <input
                  required
                  value={form.role}
                  onChange={(event) => updateField("role", event.target.value)}
                  className={autofillInputClass("role")}
                  placeholder="VP of Engineering"
                />
              </FormField>

              <FormField label="City" showCheck={showAutofillCheck("city")}>
                <input
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  className={autofillInputClass("city")}
                  placeholder="San Francisco, CA"
                />
              </FormField>

              <FormField
                label="Undergrad university"
                showCheck={showAutofillCheck("undergraduateUniversity")}
              >
                <input
                  value={form.undergraduateUniversity}
                  onChange={(event) =>
                    updateField("undergraduateUniversity", event.target.value)
                  }
                  className={autofillInputClass("undergraduateUniversity")}
                  placeholder="Stanford University"
                />
              </FormField>

              <FormField
                label="Graduate university (optional)"
                showCheck={showAutofillCheck("graduateUniversity")}
              >
                <input
                  value={form.graduateUniversity}
                  onChange={(event) => updateField("graduateUniversity", event.target.value)}
                  className={autofillInputClass("graduateUniversity")}
                  placeholder="Harvard Business School"
                />
              </FormField>

              <FormField
                label="Mutual connections"
                showCheck={showAutofillCheck("mutualCount")}
              >
                <input
                  type="number"
                  min={0}
                  value={form.mutualCount ?? ""}
                  onChange={(event) => {
                    const value = event.target.value
                    updateField(
                      "mutualCount",
                      value === "" ? null : Math.max(0, Number.parseInt(value, 10) || 0),
                    )
                  }}
                  className={autofillInputClass("mutualCount")}
                  placeholder="12"
                />
              </FormField>
            </section>
          ) : null}

          <section className="flex flex-col gap-3">
            <p className={SECTION_LABEL_CLASS}>Your input</p>

            <FormField label="LinkedIn URL">
              <input
                type="text"
                value={form.linkedinUrl}
                onChange={(event) => updateField("linkedinUrl", event.target.value)}
                className={INPUT_MANUAL_CLASS_NAME}
                placeholder="linkedin.com/in/firstname-lastname"
              />
            </FormField>

            <FormField label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className={INPUT_MANUAL_CLASS_NAME}
                placeholder="their@email.com"
              />
            </FormField>

            <FormField label="Goal">
              <select
                value={form.goal}
                onChange={(event) => updateField("goal", event.target.value)}
                className={INPUT_MANUAL_CLASS_NAME}
              >
                {GOAL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Source">
              <select
                value={form.source}
                onChange={(event) => updateField("source", event.target.value)}
                className={INPUT_MANUAL_CLASS_NAME}
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Connection type">
              <select
                value={form.connectionType}
                onChange={(event) => updateField("connectionType", event.target.value)}
                className={INPUT_MANUAL_CLASS_NAME}
              >
                {CONNECTION_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Notes">
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={4}
                className={cn(INPUT_MANUAL_CLASS_NAME, "resize-y")}
                placeholder="Add context, talking points, or follow-up notes..."
              />
            </FormField>
          </section>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting || autofilling}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || autofilling}>
              {submitting ? "Saving..." : "Add contact"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormField({
  label,
  showCheck = false,
  children,
}: {
  label: string
  showCheck?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        {showCheck ? (
          <Check
            className="h-4 w-4 shrink-0 text-[#639922]"
            strokeWidth={2.5}
            aria-label="Auto-filled"
          />
        ) : null}
      </div>
    </label>
  )
}
