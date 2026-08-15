import { cn } from "@/lib/utils"
import type { Tag } from "@/lib/data"

const TONE_STYLES: Record<Tag["tone"], string> = {
  industry: "bg-slate-100 text-slate-600",
  warm: "bg-orange-100 text-orange-700",
  cold: "bg-sky-100 text-sky-700",
  followup: "bg-amber-100 text-amber-700",
}

export function TagPill({ tag }: { tag: Tag }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
        TONE_STYLES[tag.tone],
      )}
    >
      {tag.label}
    </span>
  )
}
