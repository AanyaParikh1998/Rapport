import { cn } from "@/lib/utils"
import { calculateRelationshipScore } from "@/lib/relationship-score"
import { SignalStrength } from "@/components/signal-strength"
import type { Contact } from "@/lib/data"

export function RelationshipScoreBadge({
  contact,
  contacts,
  className,
}: {
  contact: Contact
  contacts: Contact[]
  className?: string
}) {
  const score = calculateRelationshipScore(contact, contacts)

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="text-[10px] font-medium leading-none text-foreground">{score}</span>
      <SignalStrength score={score} />
    </span>
  )
}
