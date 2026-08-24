"use client"

import { useRef } from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { WalkthroughCursor } from "@/components/onboarding/walkthrough-cursor"
import { useTrackedTriggerRect } from "@/components/onboarding/use-tracked-trigger-rect"
import { OB_USER } from "@/components/onboarding/persona"

// The selected profile must be first — `ob-s7-voice-cursor-move` in
// onboarding.css animates the cursor down to the first option's row.
const SELECTED_VOICE_PROFILE = OB_USER.secondaryVoiceProfile
const VOICE_OPTIONS = [OB_USER.secondaryVoiceProfile, OB_USER.voiceProfile] as const

export function DraftVoiceProfileDropdown() {
  const triggerRef = useRef<HTMLDivElement>(null)
  const { mounted, menuRect } = useTrackedTriggerRect(triggerRef)

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
                {SELECTED_VOICE_PROFILE}
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
                    transform: `scale(${menuRect.scale})`,
                    transformOrigin: "top left",
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
                        opt === SELECTED_VOICE_PROFILE && "ob-s7-voice-opt-pick",
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
