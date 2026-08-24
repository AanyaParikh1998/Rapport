"use client"

import { useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { WalkthroughCursor } from "@/components/onboarding/walkthrough-cursor"
import { useTrackedTriggerRect } from "@/components/onboarding/use-tracked-trigger-rect"

export type ManualDropdownDef = {
  label: string
  selected: string
  options: string[]
  classPrefix: string
}

export type ManualTextInputDef = {
  label: string
  text: string
  classPrefix: string
  typingStartDelay: number
  charMs?: number
}

function UiPasteLabel({ children }: { children: ReactNode }) {
  return <span className="text-[10px] font-medium text-muted-foreground">{children}</span>
}

function ManualFieldLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1">
      <UiPasteLabel>{label}</UiPasteLabel>
      <Pencil className="h-2.5 w-2.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-[9px] font-medium text-muted-foreground/80">Your input</span>
    </div>
  )
}

function Typewriter({
  text,
  startDelay,
  charMs = 0.05,
}: {
  text: string
  startDelay: number
  charMs?: number
}) {
  return (
    <>
      {text.split("").map((ch, index) => (
        <span
          key={`${index}-${ch}`}
          className="ob-tw-char"
          style={{ animationDelay: `${startDelay + index * charMs}s` }}
        >
          {ch}
        </span>
      ))}
    </>
  )
}

export function ManualTextInputField({
  label,
  text,
  classPrefix,
  typingStartDelay,
  charMs = 0.05,
}: ManualTextInputDef) {
  return (
    <div className={`${classPrefix}-wrap relative min-w-0`}>
      <ManualFieldLabel label={label} />
      <div
        className={`${classPrefix}-input relative mt-0.5 min-h-[30px] rounded-lg border-[0.5px] border-border bg-white px-2.5 py-2 text-[13px] text-foreground`}
      >
        <Typewriter text={text} startDelay={typingStartDelay} charMs={charMs} />
      </div>
      <WalkthroughCursor className={`${classPrefix}-cursor absolute left-[calc(50%-12px)] top-8 opacity-0`} />
    </div>
  )
}

export function ManualDropdownField({
  label,
  selected,
  options,
  classPrefix,
}: ManualDropdownDef) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const { mounted, menuRect } = useTrackedTriggerRect(triggerRef)

  return (
    <div className={`${classPrefix}-wrap relative min-w-0`}>
      <UiPasteLabel>{label}</UiPasteLabel>
      <div className="relative mt-0.5">
        <div
          ref={triggerRef}
          className={`${classPrefix}-trigger flex items-center justify-between gap-1 rounded-lg border-[0.5px] border-border bg-white p-2.5 text-[13px]`}
        >
          <span className="relative min-h-[1.125rem] min-w-0 flex-1">
            <span className={`${classPrefix}-placeholder block text-muted-foreground`}>
              Select...
            </span>
            <span
              className={`${classPrefix}-value absolute inset-0 text-foreground opacity-0`}
            >
              {selected}
            </span>
          </span>
          <ChevronDown
            className={`${classPrefix}-chevron h-3.5 w-3.5 shrink-0 text-muted-foreground`}
            strokeWidth={2}
          />
        </div>

        {mounted && menuRect
          ? createPortal(
              <div
                className={cn(
                  `${classPrefix}-menu ob-s5-dd-menu-portal pointer-events-none min-w-full overflow-visible rounded-lg border-[0.5px] border-border bg-white opacity-0 shadow-md`,
                )}
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
                {options.map((opt) => (
                  <div
                    key={opt}
                    className={cn(
                      `${classPrefix}-opt shrink-0 whitespace-nowrap px-3 py-2 text-left text-[13px] leading-snug text-foreground`,
                      opt === selected && `${classPrefix}-opt-pick`,
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

        <WalkthroughCursor className={`${classPrefix}-cursor absolute left-[calc(50%-12px)] top-8 opacity-0`} />
      </div>
    </div>
  )
}
