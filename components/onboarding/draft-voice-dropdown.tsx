"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { WalkthroughCursor } from "@/components/onboarding/walkthrough-cursor"

const VOICE_OPTIONS = ["VC and fintech outreach", "MBA networking"] as const

export function DraftVoiceProfileDropdown() {
  const triggerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(
    null,
  )

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    setMenuRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  useLayoutEffect(() => {
    setMounted(true)
    updateMenuPosition()
    window.addEventListener("resize", updateMenuPosition)
    return () => window.removeEventListener("resize", updateMenuPosition)
  }, [updateMenuPosition])

  return (
    <div className="ob-s7-voice-wrap relative">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">Voice profile</span>
        <div className="relative">
          <div
            ref={triggerRef}
            className="ob-s7-voice-trigger flex w-full items-center justify-between gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-[11px]"
          >
            <span className="relative min-h-[1rem] min-w-0 flex-1">
              <span className="ob-s7-voice-placeholder block text-muted-foreground">
                Select a profile...
              </span>
              <span className="ob-s7-voice-value absolute inset-0 text-foreground opacity-0">
                VC and fintech outreach
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
          </div>

          {mounted && menuRect
            ? createPortal(
                <div
                  className="ob-s7-voice-menu ob-s5-dd-menu-portal pointer-events-none overflow-visible rounded-md border border-input bg-background opacity-0 shadow-md"
                  style={{
                    position: "fixed",
                    top: menuRect.top,
                    left: menuRect.left,
                    minWidth: menuRect.width,
                    zIndex: 1000,
                  }}
                  role="listbox"
                  aria-hidden
                >
                  {VOICE_OPTIONS.map((opt) => (
                    <div
                      key={opt}
                      className={cn(
                        "ob-s7-voice-opt px-3 py-2 text-left text-[11px] leading-snug text-foreground",
                        opt === "VC and fintech outreach" && "ob-s7-voice-opt-pick",
                      )}
                      role="option"
                    >
                      {opt}
                    </div>
                  ))}
                </div>,
                document.body,
              )
            : null}

          <WalkthroughCursor className="ob-s7-voice-cursor absolute left-1/2 top-6 opacity-0" />
        </div>
      </label>
    </div>
  )
}
