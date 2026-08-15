"use client"

import { useEffect, useState } from "react"
import { ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export function getFirstLinePreview(text: string): string {
  const line = text.trim().split(/\n+/)[0]?.trim()
  return line ?? ""
}

export function NotesDraftsCollapsibleCard({
  title,
  preview,
  defaultExpanded = false,
  forceExpanded = false,
  highlighted = false,
  emphasis = false,
  id,
  children,
}: {
  title: string
  preview?: string | null
  defaultExpanded?: boolean
  forceExpanded?: boolean
  highlighted?: boolean
  emphasis?: boolean
  id?: string
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(defaultExpanded || forceExpanded)

  useEffect(() => {
    if (forceExpanded) setExpanded(true)
  }, [forceExpanded])

  return (
    <div
      id={id}
      className={cn(
        "rounded-md border border-border bg-background transition-colors",
        highlighted && "ring-2 ring-[#378ADD]/40",
        emphasis && "border-l-4 border-l-[#378ADD] bg-[#E6F1FB]",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-90",
          )}
        />
        <p className="min-w-0 flex-1 truncate text-[12px] leading-snug">
          <span className="font-medium text-foreground">{title}</span>
          {!expanded && preview ? (
            <span className="font-normal text-muted-foreground"> · {preview}</span>
          ) : null}
        </p>
      </button>

      {expanded ? (
        <div className="border-t border-border px-3 py-2.5">{children}</div>
      ) : null}
    </div>
  )
}

export function LogTouchpointBar({
  title,
  children,
  defaultExpanded = false,
}: {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="w-full rounded-md border border-[#378ADD]/20 border-l-[3px] border-l-[#378ADD] bg-[#E6F1FB]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <Plus className="h-3.5 w-3.5 shrink-0 text-[#185FA5]" />
        <p className="min-w-0 flex-1 truncate text-[12px] font-medium leading-snug text-[#185FA5]">
          {title}
        </p>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[#185FA5]/70 transition-transform duration-200",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded ? (
        <div className="border-t border-[#378ADD]/15 px-3 py-2.5">{children}</div>
      ) : null}
    </div>
  )
}
