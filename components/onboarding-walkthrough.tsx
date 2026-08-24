"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { IconArrowsMaximize, IconArrowsMinimize } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WALKTHROUGH_SCENES } from "@/components/onboarding/scenes"
import "./onboarding/onboarding.css"

export const RAPPORT_ONBOARDING_SEEN_KEY = "rapport_onboarding_seen"

function getSceneCaption(
  scene: (typeof WALKTHROUGH_SCENES)[number],
  elapsedMs: number,
): string {
  if (!scene.captionPhases?.length) return scene.caption
  let caption = scene.caption
  for (const phase of scene.captionPhases) {
    if (elapsedMs >= phase.atMs) caption = phase.text
  }
  return caption
}

export function OnboardingWalkthrough({
  open,
  onClose,
  onComplete,
}: {
  open: boolean
  onClose: () => void
  onComplete?: () => void
}) {
  const [sceneIndex, setSceneIndex] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [sceneComplete, setSceneComplete] = useState(false)
  const [progressKey, setProgressKey] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [paused, setPaused] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const [scrubPreviewFraction, setScrubPreviewFraction] = useState<number | null>(null)

  const sceneStartRef = useRef(0)
  const accumulatedPauseRef = useRef(0)
  const pausedAtRef = useRef<number | null>(null)
  const sceneContainerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const appliedScaleRef = useRef(1)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const progressTrackRef = useRef<HTMLDivElement>(null)
  const isScrubbingRef = useRef(false)

  const scene = WALKTHROUGH_SCENES[sceneIndex]
  const isLast = sceneIndex === WALKTHROUGH_SCENES.length - 1
  const isStatic = scene.static || scene.durationMs === 0
  const Scene = scene.Component
  const displayCaption = getSceneCaption(scene, elapsedMs)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setSceneIndex(0)
    setFullscreen(false)
  }, [open])

  useEffect(() => {
    if (!open) return

    setPaused(false)
    setSceneComplete(isStatic)
    setElapsedMs(0)
    setProgressKey((k) => k + 1)
    sceneStartRef.current = Date.now()
    accumulatedPauseRef.current = 0
    pausedAtRef.current = null
  }, [open, sceneIndex, isStatic])

  useEffect(() => {
    if (!open || isStatic || sceneComplete || paused) return

    const tick = window.setInterval(() => {
      setElapsedMs(Date.now() - sceneStartRef.current - accumulatedPauseRef.current)
    }, 40)

    return () => window.clearInterval(tick)
  }, [open, sceneIndex, isStatic, sceneComplete, paused])

  useEffect(() => {
    if (!open || isStatic || sceneComplete || paused) return

    const elapsed = Date.now() - sceneStartRef.current - accumulatedPauseRef.current
    const remaining = Math.max(0, scene.durationMs - elapsed)

    const timer = window.setTimeout(() => {
      setSceneComplete(true)
      setElapsedMs(scene.durationMs)
    }, remaining)

    return () => window.clearTimeout(timer)
  }, [open, sceneIndex, scene.durationMs, isStatic, sceneComplete, paused])

  // Scale the scene content down (never up) so it always fits inside the
  // stage's clip rect, instead of relying on every scene's own layout to
  // happen to fit.
  //
  // The tricky part is that a scene's content isn't a fixed size: elements
  // like the "Saved" confirmation pill start at `max-height: 0` and animate
  // open later via CSS (`forwards` fill mode). Measuring the *current* DOM
  // would read that pill as zero-height for most of the scene, then see it
  // jump to full height right when it reveals — and a scale/height change
  // applied at that moment reads as the whole panel visibly shrinking and
  // sliding up mid-scene, which is the glitch this is guarding against.
  // Instead, every animation on the subtree is momentarily seeked to its
  // final frame before measuring (then restored before the next paint), so
  // the height used to compute scale already reflects the scene's fully
  // settled layout — decided once, not discovered as a jump partway through.
  const measureFinalHeight = useCallback((content: HTMLElement) => {
    const elements = [content, ...content.querySelectorAll<HTMLElement>("*")]
    const seeked: [Animation, CSSNumberish | null][] = []
    for (const el of elements) {
      for (const anim of el.getAnimations()) {
        const timing = anim.effect?.getTiming()
        if (!timing) continue
        const iterations = timing.iterations
        // Infinite/looping animations (pulses, loading dots) don't represent
        // a one-time size reveal — leave them alone.
        if (iterations === undefined || !Number.isFinite(iterations)) continue
        const duration = typeof timing.duration === "number" ? timing.duration : 0
        const delay = typeof timing.delay === "number" ? timing.delay : 0
        seeked.push([anim, anim.currentTime])
        anim.currentTime = delay + duration * iterations
      }
    }

    const contentRect = content.getBoundingClientRect()
    let maxBottom = contentRect.top
    for (let i = 1; i < elements.length; i++) {
      const el = elements[i]
      // A walkthrough cursor's fade-out finishes well before its longer
      // glide-to-position animation does, so at the true final frame it
      // sits, invisibly, wherever that glide ends up — which can be well
      // outside the panel's visible layout. An element with no effective
      // opacity at its final frame doesn't constrain the panel's size.
      // (checkVisibility, not getComputedStyle: opacity is a compositing
      // effect, so a faded-out div's child SVG still reports its own
      // computed opacity as 1 — checkVisibility is what accounts for the
      // ancestor chain.)
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue
      const bottom = el.getBoundingClientRect().bottom
      if (bottom > maxBottom) maxBottom = bottom
    }

    for (const [anim, time] of seeked) anim.currentTime = time

    return maxBottom - contentRect.top
  }, [])

  const applyFitScale = useCallback(() => {
    const stage = stageRef.current
    const content = sceneContainerRef.current
    if (!stage || !content) return

    const stageRect = stage.getBoundingClientRect()
    if (stageRect.height <= 0) return

    const currentScale = appliedScaleRef.current || 1
    const naturalContentHeight = measureFinalHeight(content) / currentScale
    if (naturalContentHeight <= 0) return

    const overflows = naturalContentHeight > stageRect.height + 0.5
    const nextScale = overflows ? Math.max(0.6, stageRect.height / naturalContentHeight) : 1

    const nextHeight = overflows ? `${Math.ceil(naturalContentHeight)}px` : ""
    if (content.style.height !== nextHeight) {
      content.style.height = nextHeight
      content.style.maxHeight = overflows ? "none" : ""
      // The stage centers its child vertically. A wrapper that is taller than
      // the stage would therefore start *above* the clip edge and lose its top
      // (the scale-down happens from `top center`, so the pre-scale position is
      // what gets centered). Anchor it to the stage top instead; once scaled,
      // its visual height matches the stage exactly.
      content.style.alignSelf = overflows ? "flex-start" : ""
    }

    if (Math.abs(nextScale - currentScale) > 0.005) {
      appliedScaleRef.current = nextScale
      content.style.transform = nextScale < 1 ? `scale(${nextScale})` : ""
      content.style.transformOrigin = "top center"
      // Scaling moves every element in the scene, including the triggers that
      // portaled dropdown menus are positioned against. Tell them to re-measure
      // now instead of leaving them stale until the next animation frame (which
      // never comes while the tab is hidden).
      window.dispatchEvent(new Event("resize"))
    }
  }, [measureFinalHeight])

  // Reset and re-measure whenever the scene changes (fresh DOM subtree). One
  // measurement is enough — see measureFinalHeight above — so there's no
  // ongoing poll to keep the scale from drifting mid-scene.
  useLayoutEffect(() => {
    appliedScaleRef.current = 1
    const content = sceneContainerRef.current
    if (content) {
      content.style.transform = ""
      content.style.transformOrigin = "top center"
      content.style.height = ""
      content.style.maxHeight = ""
      content.style.alignSelf = ""
    }
    applyFitScale()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIndex, applyFitScale])

  // Re-measure when the stage itself resizes (viewport resize, fullscreen toggle).
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => applyFitScale())
    observer.observe(stage)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIndex, applyFitScale])

  const finish = useCallback(() => {
    onComplete?.()
    onClose()
  }, [onClose, onComplete])

  const goBack = useCallback(() => {
    if (sceneIndex <= 0) return
    setSceneIndex((i) => i - 1)
  }, [sceneIndex])

  const goNext = useCallback(() => {
    if (sceneIndex >= WALKTHROUGH_SCENES.length - 1) {
      finish()
      return
    }

    setPaused(false)
    setSceneIndex((i) => i + 1)
  }, [sceneIndex, finish])

  const togglePause = useCallback(() => {
    setPaused((wasPaused) => {
      if (!wasPaused) {
        pausedAtRef.current = Date.now()
        return true
      }
      if (pausedAtRef.current !== null) {
        accumulatedPauseRef.current += Date.now() - pausedAtRef.current
        pausedAtRef.current = null
      }
      return false
    })
  }, [])

  const toggleFullscreen = useCallback(() => {
    setFullscreen((value) => !value)
  }, [])

  const seekToMs = useCallback(
    (targetMs: number) => {
      const clampedMs = Math.max(0, Math.min(targetMs, scene.durationMs))

      const container = sceneContainerRef.current
      if (container) {
        for (const animation of container.getAnimations({ subtree: true })) {
          animation.currentTime = clampedMs
        }
      }

      sceneStartRef.current = Date.now() - clampedMs
      accumulatedPauseRef.current = 0
      pausedAtRef.current = null
      setElapsedMs(clampedMs)
      setSceneComplete(clampedMs >= scene.durationMs)
      setPaused(false)
    },
    [scene.durationMs],
  )

  // The progress-bar fill's CSS animation is disabled (via the "is-running" class
  // removal) while scrubbing, so it doesn't exist yet at the moment seekToMs runs —
  // setting currentTime there is a no-op. Once the drag/click ends and React
  // re-renders with the animation restored, sync its currentTime here instead.
  useLayoutEffect(() => {
    if (scrubPreviewFraction !== null) return
    const progressBar = progressBarRef.current
    if (!progressBar) return
    for (const animation of progressBar.getAnimations()) {
      animation.currentTime = elapsedMs
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubPreviewFraction])

  const computeFractionFromClientX = useCallback((clientX: number) => {
    const track = progressTrackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    if (rect.width === 0) return 0
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  const handleScrubStart = useCallback(
    (e: React.MouseEvent) => {
      if (isStatic) return
      e.stopPropagation()
      isScrubbingRef.current = true
      setScrubPreviewFraction(computeFractionFromClientX(e.clientX))
    },
    [isStatic, computeFractionFromClientX],
  )

  useEffect(() => {
    if (!open) return

    function handleMove(e: MouseEvent) {
      if (!isScrubbingRef.current) return
      setScrubPreviewFraction(computeFractionFromClientX(e.clientX))
    }

    function handleUp(e: MouseEvent) {
      if (!isScrubbingRef.current) return
      isScrubbingRef.current = false
      const fraction = computeFractionFromClientX(e.clientX)
      setScrubPreviewFraction(null)
      seekToMs(fraction * scene.durationMs)
    }

    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleUp)
    return () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleUp)
    }
  }, [open, computeFractionFromClientX, seekToMs, scene.durationMs])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        finish()
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        goBack()
        return
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        goNext()
        return
      }
      if (e.key === " " || e.code === "Space") {
        const target = e.target as HTMLElement
        if (target.closest("button")) return
        e.preventDefault()
        togglePause()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, finish, goBack, goNext, togglePause])

  if (!mounted || !open) return null

  const progressRunning = !isStatic && !sceneComplete
  const progressDone = isStatic || sceneComplete
  const canAdvance = sceneComplete || paused

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] flex bg-black/60",
        fullscreen ? "items-stretch justify-stretch p-0" : "items-center justify-center",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-caption"
      onClick={finish}
    >
      <div
        className={cn(
          "flex flex-col overflow-hidden bg-background shadow-2xl",
          fullscreen ? "h-full w-full rounded-none" : "rounded-xl",
        )}
        style={
          fullscreen
            ? undefined
            : { width: "85vw", height: "85vh", maxWidth: "100vw", maxHeight: "100vh" }
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 px-2 py-1.5">
          <div
            ref={progressTrackRef}
            className={cn(
              "relative h-1 min-w-0 flex-1 bg-muted",
              !isStatic && "cursor-pointer",
            )}
            onMouseDown={handleScrubStart}
            role={isStatic ? undefined : "slider"}
            aria-label={isStatic ? undefined : "Scrub timeline"}
            aria-valuenow={isStatic ? undefined : Math.round(elapsedMs)}
            aria-valuemin={isStatic ? undefined : 0}
            aria-valuemax={isStatic ? undefined : scene.durationMs}
          >
            <div
              key={progressKey}
              ref={progressBarRef}
              className={cn(
                "ob-progress-bar-fill relative",
                scrubPreviewFraction === null && progressRunning && "is-running",
                scrubPreviewFraction === null && progressDone && "is-done",
                scrubPreviewFraction === null && progressRunning && paused && "is-paused",
              )}
              style={
                scrubPreviewFraction !== null
                  ? { width: `${scrubPreviewFraction * 100}%`, animation: "none" }
                  : progressRunning
                    ? { animationDuration: `${scene.durationMs}ms` }
                    : undefined
              }
            >
              {!isStatic ? (
                <span
                  className={cn(
                    "absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary shadow-sm ring-2 ring-background transition-transform",
                    scrubPreviewFraction !== null && "scale-125",
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleFullscreen()
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-muted-foreground"
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {fullscreen ? (
              <IconArrowsMinimize className="h-3.5 w-3.5" stroke={1.75} />
            ) : (
              <IconArrowsMaximize className="h-3.5 w-3.5" stroke={1.75} />
            )}
          </button>
        </div>

        <div key={sceneIndex} className="flex min-h-0 flex-1 flex-col px-8 pt-6">
          <div
            ref={stageRef}
            className={cn(
              "relative flex min-h-0 flex-1 cursor-pointer items-center justify-center overflow-hidden",
              paused && "ob-is-paused",
            )}
            onClick={togglePause}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                togglePause()
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={paused ? "Resume scene" : "Pause scene"}
          >
            <div ref={sceneContainerRef} className="h-full w-full max-h-full">
              <Scene />
            </div>
            <div className={cn("ob-pause-overlay", paused && "is-visible")} aria-hidden={!paused}>
              <div className="ob-pause-icon">
                <span className="ob-pause-icon-bar" />
                <span className="ob-pause-icon-bar" />
              </div>
            </div>
          </div>
          {displayCaption ? (
            <p
              id="onboarding-caption"
              className="shrink-0 py-4 text-center text-[15px] leading-relaxed text-muted-foreground transition-opacity duration-300"
            >
              {displayCaption}
            </p>
          ) : (
            <div className="shrink-0 py-4" aria-hidden />
          )}
        </div>

        {sceneIndex === 0 ? (
          <p className="shrink-0 px-8 pb-2 text-center text-[12px] text-muted-foreground/70">
            ← → to navigate · Click or Space to pause
          </p>
        ) : null}

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-8 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={sceneIndex === 0}
            onClick={(e) => {
              e.stopPropagation()
              goBack()
            }}
          >
            Back
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLast ? "Get started" : canAdvance ? "Next" : "Skip scene"}
          </Button>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-border px-8 py-3">
          <span className="text-[13px] font-medium text-muted-foreground">
            {scene.actLabel ?? "Welcome"}
          </span>

          <div className="flex items-center gap-1.5">
            {WALKTHROUGH_SCENES.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === sceneIndex
                    ? "w-4 bg-primary"
                    : i < sceneIndex
                      ? "w-1.5 bg-primary/40"
                      : "w-1.5 bg-muted-foreground/25",
                )}
                aria-hidden
              />
            ))}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              finish()
            }}
            className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Skip walkthrough
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
