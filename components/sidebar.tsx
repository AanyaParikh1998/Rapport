"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ComponentType } from "react"
import {
  KanbanSquare,
  Network,
  Users,
  Send,
  CalendarClock,
  Settings,
  Search,
} from "lucide-react"
import { IconPlayerPlay } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { fetchContacts } from "@/lib/contacts"
import { CONTACTS_CHANGED_EVENT } from "@/lib/contacts-events"
import { useGlobalSearch } from "@/components/global-search"
import type { Contact } from "@/lib/data"
import { getFollowUpCount } from "@/lib/follow-ups"

const PRIMARY_NAV = [
  { label: "Pipeline", icon: KanbanSquare, href: "/" },
  { label: "Network", icon: Network, href: "/network" },
  { label: "Contacts", icon: Users, href: "/contacts" },
  { label: "Outreach", icon: Send },
  { label: "Follow-ups", icon: CalendarClock, href: "/follow-ups" },
]

const SECONDARY_NAV = [
  { label: "Preferences", icon: Settings, href: "/preferences" },
  { label: "Guide", icon: GuideNavIcon, href: "/help" },
]

function GuideNavIcon({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return <IconPlayerPlay className={className} stroke={strokeWidth ?? 2} />
}

export function Sidebar() {
  const pathname = usePathname()
  const { open: openGlobalSearch } = useGlobalSearch()
  const [contactsForBadge, setContactsForBadge] = useState<Contact[] | null>(null)
  const [followUpCount, setFollowUpCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadFollowUpCount() {
      try {
        const contacts = await fetchContacts()
        if (!cancelled) {
          setContactsForBadge(contacts)
        }
      } catch {
        if (!cancelled) setContactsForBadge([])
      }
    }

    loadFollowUpCount()

    function handleContactsChanged(event: Event) {
      const contacts = (event as CustomEvent<Contact[]>).detail
      if (Array.isArray(contacts)) {
        setContactsForBadge(contacts)
      }
    }

    window.addEventListener(CONTACTS_CHANGED_EVENT, handleContactsChanged)

    return () => {
      cancelled = true
      window.removeEventListener(CONTACTS_CHANGED_EVENT, handleContactsChanged)
    }
  }, [])

  useEffect(() => {
    if (contactsForBadge === null) return
    setFollowUpCount(getFollowUpCount(contactsForBadge))
  }, [contactsForBadge])

  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
          R
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Rapport
        </span>
      </div>

      <div className="px-2 pb-2">
        <button
          type="button"
          onClick={openGlobalSearch}
          className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="flex-1 text-left">Search</span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 pt-2">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.label}
            {...item}
            active={item.href ? pathname === item.href : false}
            badge={item.label === "Follow-ups" ? followUpCount : undefined}
          />
        ))}

        <div className="my-3 mx-3 border-t border-border" />

        {SECONDARY_NAV.map((item) => (
          <NavLink
            key={item.label}
            {...item}
            active={item.href ? pathname === item.href : false}
          />
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-medium text-emerald-700">
            JD
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">Jordan Doe</p>
            <p className="truncate text-[11px] text-muted-foreground">Free plan</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function NavLink({
  label,
  icon: Icon,
  active,
  badge,
  href,
}: {
  label: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  active?: boolean
  badge?: number
  href?: string
}) {
  const className = cn(
    "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors",
    active
      ? "bg-accent font-medium text-accent-foreground"
      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
  )

  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span className="flex-1 text-left">{label}</span>
      {badge ? (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {badge}
        </span>
      ) : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" className={className}>
      {content}
    </button>
  )
}
