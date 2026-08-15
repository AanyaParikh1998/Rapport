"use client"

import { IconPlayerPlay } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { useOnboarding } from "@/components/onboarding-provider"

const COVER_DOTS = [
  { top: "12%", left: "8%", size: 6 },
  { top: "22%", left: "78%", size: 4 },
  { top: "38%", left: "18%", size: 5 },
  { top: "52%", left: "88%", size: 7 },
  { top: "68%", left: "12%", size: 4 },
  { top: "74%", left: "62%", size: 5 },
  { top: "18%", left: "44%", size: 3 },
  { top: "58%", left: "36%", size: 4 },
  { top: "82%", left: "28%", size: 6 },
  { top: "44%", left: "72%", size: 3 },
  { top: "30%", left: "92%", size: 5 },
  { top: "86%", left: "82%", size: 4 },
] as const

const FEATURE_PILLS = ["AI outreach", "Network graph", "Calendar sync"] as const

export function GuideWalkthroughCard() {
  const { openWalkthrough } = useOnboarding()

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <button
        type="button"
        onClick={openWalkthrough}
        className="group relative h-[280px] w-full overflow-hidden bg-gradient-to-br from-[#26215C] to-[#042C53] text-left"
        aria-label="Watch the walkthrough"
      >
        {COVER_DOTS.map((dot, index) => (
          <span
            key={index}
            className="pointer-events-none absolute rounded-full bg-white opacity-[0.08]"
            style={{
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
            }}
            aria-hidden
          />
        ))}

        <div className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-md bg-white text-xs font-bold text-primary">
          R
        </div>

        <div className="absolute inset-x-0 top-[18%] flex flex-col items-center gap-2 px-6 text-center">
          <span className="text-[28px] font-medium leading-none tracking-tight text-white">
            Rapport
          </span>
          <p className="max-w-sm text-[14px] leading-snug text-[#AFA9EC]">
            Your personal CRM for high-stakes networking
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            {FEATURE_PILLS.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-white/10 px-2.5 py-0.5 text-[13px] text-white"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-2">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white shadow-lg transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.12] group-hover:shadow-[0_0_0_12px_rgba(255,255,255,0.1)]">
            <IconPlayerPlay className="ml-1 h-8 w-8 text-[#26215C]" stroke={0} fill="currentColor" />
          </div>
          <span className="text-[12px] text-white/70">Watch the interactive demo</span>
        </div>
      </button>

      <div className="flex flex-col gap-4 border-t border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Watch the walkthrough</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            A 2 minute interactive demo of every feature
          </p>
        </div>
        <Button type="button" size="sm" onClick={openWalkthrough} className="shrink-0">
          Watch now
        </Button>
      </div>
    </div>
  )
}
