"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"

/**
 * Position + scale info for a portaled dropdown menu, expressed in the
 * *unscaled* coordinate space of the trigger (see `scale`).
 */
export type TrackedMenuRect = {
  top: number
  left: number
  /** Trigger's unscaled layout width (offsetWidth) — use as the menu's min-width. */
  width: number
  /**
   * Ratio of the trigger's rendered (visual) width to its unscaled layout
   * width. Apply as `transform: scale(scale)` with `transform-origin: top left`
   * on the portaled menu so it shrinks/grows in step with a scaled ancestor
   * (e.g. the onboarding walkthrough's fit-to-stage scaling).
   */
  scale: number
}

const EPSILON_PX = 0.5
const EPSILON_SCALE = 0.001

/**
 * Tracks a trigger element's position/scale on every animation frame (not
 * just on mount + window resize), so a portaled menu rendered via
 * createPortal never goes stale when the trigger moves due to a CSS
 * animation or an ancestor's own layout-affecting transform.
 *
 * setState is only called when the measured values actually change (beyond
 * a small epsilon), so this does not force a render every frame.
 */
export function useTrackedTriggerRect(
  triggerRef: RefObject<HTMLElement | null>,
): { mounted: boolean; menuRect: TrackedMenuRect | null } {
  const [mounted, setMounted] = useState(false)
  const [menuRect, setMenuRect] = useState<TrackedMenuRect | null>(null)
  const lastRef = useRef<TrackedMenuRect | null>(null)

  const measureOnce = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const offsetWidth = trigger.offsetWidth || rect.width || 1
    const scale = offsetWidth > 0 ? rect.width / offsetWidth : 1
    const next: TrackedMenuRect = {
      top: rect.bottom + 4,
      left: rect.left,
      width: offsetWidth,
      scale,
    }
    const last = lastRef.current
    const changed =
      !last ||
      Math.abs(last.top - next.top) > EPSILON_PX ||
      Math.abs(last.left - next.left) > EPSILON_PX ||
      Math.abs(last.width - next.width) > EPSILON_PX ||
      Math.abs(last.scale - next.scale) > EPSILON_SCALE
    if (changed) {
      lastRef.current = next
      setMenuRect(next)
    }
  }, [triggerRef])

  // Seed the position synchronously on mount. This must not depend on the rAF
  // loop below: requestAnimationFrame does not fire while the tab is hidden,
  // and without an initial rect the portaled menu never renders at all.
  useLayoutEffect(() => {
    setMounted(true)
    measureOnce()
  }, [measureOnce])

  // A resize can change the stage's fit-scale, which moves every trigger. Handle
  // it synchronously rather than waiting on the rAF loop, which is paused while
  // the tab is hidden.
  useEffect(() => {
    window.addEventListener("resize", measureOnce)
    return () => window.removeEventListener("resize", measureOnce)
  }, [measureOnce])

  // Then keep it fresh every frame, so the menu follows its trigger when a CSS
  // animation or an ancestor's transform moves it after mount.
  useEffect(() => {
    let rafId = 0
    let cancelled = false

    const tick = () => {
      if (cancelled) return
      measureOnce()
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    }
  }, [measureOnce])

  return { mounted, menuRect }
}
