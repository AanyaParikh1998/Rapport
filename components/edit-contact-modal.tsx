"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateContact, type EditContactInput } from "@/lib/contacts"
import type { Contact } from "@/lib/data"

const GOAL_OPTIONS = ["Informational call", "Referral", "Mentorship"] as const
const SOURCE_OPTIONS = ["LinkedIn", "Warm intro", "Conference", "Personal", "Other"] as const
const CONNECTION_TYPE_OPTIONS = ["Cold", "Warm", "Hot"] as const

const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function contactToForm(contact: Contact): EditContactInput {
  return {
    name: contact.name,
    company: contact.company,
    role: contact.role,
    city: contact.city ?? "",
    undergraduateUniversity: contact.undergraduateUniversity ?? "",
    graduateUniversity: contact.graduateUniversity ?? "",
    goal: contact.goal,
    source: contact.source,
    connectionType: contact.connectionType,
    notes: contact.notes,
    linkedinUrl: contact.linkedinUrl ?? "",
    email: contact.email ?? "",
    mutualCount: contact.mutualCount ?? null,
    trackCalendar: contact.trackCalendar,
  }
}

export function EditContactModal({
  contact,
  onClose,
  onUpdated,
}: {
  contact: Contact | null
  onClose: () => void
  onUpdated: (contact: Contact) => void
}) {
  const [form, setForm] = useState<EditContactInput | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hotTrackingPromptVisible, setHotTrackingPromptVisible] = useState(false)

  useEffect(() => {
    if (contact) {
      setForm(contactToForm(contact))
      setHotTrackingPromptVisible(false)
      setError(null)
    } else {
      setForm(null)
    }
  }, [contact])

  if (!contact || !form) return null

  function updateField<K extends keyof EditContactInput>(key: K, value: EditContactInput[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  function handleConnectionTypeChange(nextType: string) {
    if (!form) return

    const previousType = form.connectionType
    updateField("connectionType", nextType)

    if (previousType === "Hot" && (nextType === "Warm" || nextType === "Cold")) {
      updateField("trackCalendar", true)
      setHotTrackingPromptVisible(false)
      return
    }

    if (nextType === "Hot" && previousType !== "Hot") {
      setHotTrackingPromptVisible(true)
      return
    }

    setHotTrackingPromptVisible(false)
  }

  function getErrorMessage(err: unknown) {
    return err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String(err.message)
        : "Failed to save contact"
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!contact || !form) return

    setError(null)
    setSubmitting(true)

    try {
      const updated = await updateContact(contact.id, form)
      onUpdated(updated)
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
        aria-label="Close edit contact modal"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-contact-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="edit-contact-title" className="text-sm font-semibold text-foreground">
              Edit contact
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Update {contact.name}&apos;s details.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FormField label="LinkedIn URL">
            <input
              type="text"
              value={form.linkedinUrl}
              onChange={(event) => updateField("linkedinUrl", event.target.value)}
              className={inputClassName}
              placeholder="Paste LinkedIn profile URL here e.g. linkedin.com/in/firstname-lastname"
            />
          </FormField>

          <FormField label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={inputClassName}
              placeholder="their@email.com"
            />
          </FormField>

          <FormField label="Name">
            <input
              required
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className={inputClassName}
            />
          </FormField>

          <FormField label="Company">
            <input
              required
              value={form.company}
              onChange={(event) => updateField("company", event.target.value)}
              className={inputClassName}
            />
          </FormField>

          <FormField label="Role">
            <input
              required
              value={form.role}
              onChange={(event) => updateField("role", event.target.value)}
              className={inputClassName}
            />
          </FormField>

          <FormField label="City">
            <input
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              className={inputClassName}
              placeholder="San Francisco, CA"
            />
          </FormField>

          <FormField label="Undergrad university">
            <input
              value={form.undergraduateUniversity}
              onChange={(event) => updateField("undergraduateUniversity", event.target.value)}
              className={inputClassName}
              placeholder="Stanford University"
            />
          </FormField>

          <FormField label="Graduate university (optional)">
            <input
              value={form.graduateUniversity}
              onChange={(event) => updateField("graduateUniversity", event.target.value)}
              className={inputClassName}
              placeholder="Harvard Business School"
            />
          </FormField>

          <FormField label="Mutual connections">
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
              className={inputClassName}
              placeholder="12"
            />
          </FormField>

          <FormField label="Goal">
            <select
              value={form.goal}
              onChange={(event) => updateField("goal", event.target.value)}
              className={inputClassName}
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
              className={inputClassName}
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
              onChange={(event) => handleConnectionTypeChange(event.target.value)}
              className={inputClassName}
            >
              {CONNECTION_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>

          {hotTrackingPromptVisible ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-[12px] leading-snug text-amber-900">
                Turn off calendar tracking for this contact? Recommended for close contacts.
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    updateField("trackCalendar", false)
                    setHotTrackingPromptVisible(false)
                  }}
                >
                  Turn off
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => setHotTrackingPromptVisible(false)}
                >
                  Keep on
                </Button>
              </div>
            </div>
          ) : null}

          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={4}
              className={`${inputClassName} resize-y`}
              placeholder="Add context, talking points, or follow-up notes..."
            />
          </FormField>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
              {error}
            </p>
          ) : null}

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
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

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
