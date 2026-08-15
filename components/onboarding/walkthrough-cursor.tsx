import { cn } from "@/lib/utils"

export function WalkthroughCursor({ className }: { className?: string }) {
  return (
    <div className={cn("ob-walkthrough-cursor", className)} aria-hidden>
      <svg
        width="24"
        height="28"
        viewBox="0 0 24 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block h-7 w-6"
      >
        <path
          d="M0 0V22.5L6.25 16.75L9.75 25.5L12.75 24.5L9.25 15.75H17.5L0 0Z"
          fill="white"
          stroke="black"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
