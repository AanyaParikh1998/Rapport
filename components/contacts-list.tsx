"use client"

import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Contact } from "@/lib/data"
import { getContactCity } from "@/lib/cities"
import {
  DEFAULT_CONTACT_LIST_FILTERS,
  filterAndSortContacts,
  formatContactUpdatedLabel,
  getUniqueCities,
  getUniqueUniversities,
  hasActiveContactListFilters,
  isRecentlyActiveContact,
  type ContactListFilters,
  type StatusFilter,
} from "@/lib/contacts-list"
import { Avatar } from "@/components/avatar"
import { TagPill } from "@/components/tag-pill"
import { RelationshipScoreBadge } from "@/components/relationship-score-badge"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "not_contacted", label: "Not contacted" },
  { value: "in_progress", label: "In progress" },
  { value: "responded", label: "Responded" },
  { value: "met_connected", label: "Met / Connected" },
]

const selectClassName =
  "h-8 w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-[12px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const LIST_GRID_CLASS =
  "grid w-full grid-cols-[minmax(200px,2fr)_minmax(140px,1.2fr)_96px_72px_80px_48px_88px] items-center gap-x-4"

export function ContactsList({
  contacts,
  selectedId,
  filters,
  onFiltersChange,
  onSelect,
}: {
  contacts: Contact[]
  selectedId: string | null
  filters: ContactListFilters
  onFiltersChange: (filters: ContactListFilters) => void
  onSelect: (id: string) => void
}) {
  const visibleContacts = filterAndSortContacts(contacts, filters)
  const universityOptions = getUniqueUniversities(contacts)
  const cityOptions = getUniqueCities(contacts)

  function updateFilter<K extends keyof ContactListFilters>(
    key: K,
    value: ContactListFilters[K],
  ) {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => updateFilter("query", event.target.value)}
            placeholder="Search by name, company, or university..."
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <FilterSelect
            label="Status"
            value={filters.status}
            options={STATUS_OPTIONS}
            onChange={(value) => updateFilter("status", value as StatusFilter)}
          />

          <FilterSelect
            label="City"
            value={filters.city}
            options={[
              { value: "all", label: "All cities" },
              ...cityOptions.map((city) => ({
                value: city,
                label: city,
              })),
            ]}
            onChange={(value) => updateFilter("city", value)}
          />

          <FilterSelect
            label="University"
            value={filters.university}
            options={[
              { value: "all", label: "All universities" },
              ...universityOptions.map((university) => ({
                value: university,
                label: university,
              })),
            ]}
            onChange={(value) => updateFilter("university", value)}
          />
        </div>
      </div>

      {visibleContacts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-[13px] font-medium text-foreground">No contacts found</p>
          <p className="mt-1 max-w-sm text-[12px] text-muted-foreground">
            Try adjusting your search or filters to find who you are looking for.
          </p>
          {hasActiveContactListFilters(filters) ? (
            <button
              type="button"
              onClick={() => onFiltersChange(DEFAULT_CONTACT_LIST_FILTERS)}
              className="mt-3 text-[12px] font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              LIST_GRID_CLASS,
              "border-b border-border px-5 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
            )}
          >
            <span>Contact</span>
            <span>Email</span>
            <span>City</span>
            <span>Type</span>
            <span>Mutuals</span>
            <span>Score</span>
            <span>Updated</span>
          </div>

          <ul className="divide-y divide-border">
            {visibleContacts.map((contact) => (
              <ContactListRow
                key={contact.id}
                contact={contact}
                contacts={contacts}
                selected={contact.id === selectedId}
                onSelect={() => onSelect(contact.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[11px] text-muted-foreground">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={selectClassName}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ContactListRow({
  contact,
  contacts,
  selected,
  onSelect,
}: {
  contact: Contact
  contacts: Contact[]
  selected: boolean
  onSelect: () => void
}) {
  const connectionTag = contact.tags.find(
    (tag) => tag.label === "Hot" || tag.label === "Warm" || tag.label === "Cold",
  )
  const recentlyActive = isRecentlyActiveContact(contact)
  const city = getContactCity(contact)

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          LIST_GRID_CLASS,
          "px-5 py-3 text-left transition-colors",
          selected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "hover:bg-muted/40",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <Avatar name={contact.name} />
            {recentlyActive ? (
              <span
                className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#378ADD] ring-2 ring-card"
                aria-label="Recently active"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {contact.name}
            </p>
            <p className="truncate text-[12px] text-muted-foreground">{contact.company}</p>
          </div>
        </div>

        <p className="truncate text-[12px] text-muted-foreground">
          {contact.email?.trim() ? (
            <a
              href={`mailto:${contact.email.trim()}`}
              onClick={(event) => event.stopPropagation()}
              className="text-primary hover:underline"
            >
              {contact.email.trim()}
            </a>
          ) : (
            "—"
          )}
        </p>

        <p className="truncate text-[12px] text-muted-foreground">{city || "—"}</p>

        <div className="flex items-center">
          {connectionTag ? <TagPill tag={connectionTag} /> : <span className="text-[11px] text-muted-foreground/40">—</span>}
        </div>

        <p className="truncate text-[11px] text-muted-foreground">
          {contact.mutualCount && contact.mutualCount > 0
            ? `${contact.mutualCount} mutual${contact.mutualCount === 1 ? "" : "s"}`
            : "—"}
        </p>

        <RelationshipScoreBadge contact={contact} contacts={contacts} />

        <p className="truncate text-[11px] text-muted-foreground">
          {formatContactUpdatedLabel(contact)}
        </p>
      </button>
    </li>
  )
}

export function getContactListSubtitle(count: number, loading: boolean): string {
  if (loading) return "Loading contacts..."
  return `${count} contact${count === 1 ? "" : "s"}`
}
