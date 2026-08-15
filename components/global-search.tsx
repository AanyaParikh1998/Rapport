"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/avatar"
import { fetchContacts } from "@/lib/contacts"
import type { Contact, Stage } from "@/lib/data"
import { searchContacts } from "@/lib/global-search"
import { getStageDisplayLabel } from "@/lib/stages"

type GlobalSearchContextValue = {
  open: () => void
  close: () => void
  isOpen: boolean
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null)

const STAGE_PILL_STYLES: Record<Stage, string> = {
  not_contacted: "bg-slate-100 text-slate-600",
  in_progress: "bg-sky-100 text-sky-700",
  responded: "bg-amber-100 text-amber-700",
  met_connected: "bg-emerald-100 text-emerald-700",
}

function StagePill({ stage }: { stage: Stage }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
        STAGE_PILL_STYLES[stage],
      )}
    >
      {getStageDisplayLabel(stage)}
    </span>
  )
}

function GlobalSearchModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const results = useMemo(() => searchContacts(contacts, query), [contacts, query])
  const hasQuery = query.trim().length > 0

  useEffect(() => {
    if (!open) {
      setQuery("")
      setHighlightedIndex(0)
      setLoadError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)

    fetchContacts()
      .then((data) => {
        if (!cancelled) setContacts(data)
      })
      .catch((error) => {
        if (!cancelled) {
          setContacts([])
          setLoadError(error instanceof Error ? error.message : "Failed to load contacts")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [open])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query])

  useEffect(() => {
    if (results.length === 0) {
      setHighlightedIndex(0)
      return
    }

    setHighlightedIndex((current) => Math.min(current, results.length - 1))
  }, [results.length])

  const selectContact = useCallback(
    (contact: Contact) => {
      onClose()
      router.push(`/?contact=${contact.id}`)
    },
    [onClose, router],
  )

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
        return
      }

      if (results.length === 0) return

      if (event.key === "ArrowDown") {
        event.preventDefault()
        setHighlightedIndex((current) => (current + 1) % results.length)
        return
      }

      if (event.key === "ArrowUp") {
        event.preventDefault()
        setHighlightedIndex((current) => (current - 1 + results.length) % results.length)
        return
      }

      if (event.key === "Enter") {
        event.preventDefault()
        const selected = results[highlightedIndex]
        if (selected) selectContact(selected)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose, results, highlightedIndex, selectContact])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh]">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-search-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <div className="border-b border-border px-4 py-3">
          <label htmlFor="global-search-input" className="sr-only">
            Search contacts
          </label>
          <input
            id="global-search-input"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contacts by name, company, role, or city..."
            className="w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="max-h-[320px] overflow-y-auto px-2 py-2">
          {loading ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
              Loading contacts...
            </p>
          ) : loadError ? (
            <p className="px-3 py-6 text-center text-[13px] text-destructive">{loadError}</p>
          ) : !hasQuery ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
              Start typing to search your contacts
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
              No contacts found
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {results.map((contact, index) => {
                const highlighted = index === highlightedIndex

                return (
                  <li key={contact.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => selectContact(contact)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        highlighted ? "bg-accent" : "hover:bg-accent/60",
                      )}
                    >
                      <Avatar name={contact.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">
                          {contact.name}
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {contact.company}
                        </p>
                      </div>
                      <StagePill stage={contact.stage} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-4 py-2.5">
          <p className="text-center text-[11px] text-muted-foreground">
            ↵ to select · Esc to close
          </p>
        </div>
      </div>
    </div>
  )
}

export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isModifier = event.metaKey || event.ctrlKey
      if (!isModifier || event.key.toLowerCase() !== "k") return

      event.preventDefault()
      setIsOpen((current) => !current)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <GlobalSearchContext.Provider value={{ open, close, isOpen }}>
      {children}
      <GlobalSearchModal open={isOpen} onClose={close} />
    </GlobalSearchContext.Provider>
  )
}

export function useGlobalSearch() {
  const context = useContext(GlobalSearchContext)
  if (!context) {
    throw new Error("useGlobalSearch must be used within GlobalSearchProvider")
  }
  return context
}
