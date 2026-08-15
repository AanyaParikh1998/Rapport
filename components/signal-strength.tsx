import { cn } from "@/lib/utils"

const BAR_HEIGHTS = [6, 9, 12, 15] as const
const FILLED_COLOR = "#000000"
const UNFILLED_COLOR = "#ECECEA"

function getFilledBarCount(score: number): number {
  if (score <= 25) return 1
  if (score <= 50) return 2
  if (score <= 75) return 3
  return 4
}

export function SignalStrength({
  score,
  className,
}: {
  score: number
  className?: string
}) {
  const filledCount = getFilledBarCount(Math.max(0, Math.min(100, score)))

  return (
    <div
      className={cn("flex items-end gap-0.5", className)}
      role="img"
      aria-label={`Relationship strength ${score}`}
    >
      {BAR_HEIGHTS.map((height, index) => (
        <div
          key={height}
          className="w-1 rounded-[1px]"
          style={{
            height,
            backgroundColor: index < filledCount ? FILLED_COLOR : UNFILLED_COLOR,
          }}
        />
      ))}
    </div>
  )
}
