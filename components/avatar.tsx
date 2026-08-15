import { cn } from "@/lib/utils"
import { getInitials } from "@/lib/initials"

export function Avatar({
  name,
  size = "sm",
}: {
  name: string
  size?: "sm" | "lg"
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[#444441] font-medium text-white",
        size === "sm" ? "h-7 w-7 text-[11px]" : "h-12 w-12 text-base",
      )}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  )
}
