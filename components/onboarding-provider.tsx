"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  OnboardingWalkthrough,
  RAPPORT_ONBOARDING_SEEN_KEY,
} from "@/components/onboarding-walkthrough"

type OnboardingContextValue = {
  openWalkthrough: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider")
  }
  return ctx
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [checkedStorage, setCheckedStorage] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(RAPPORT_ONBOARDING_SEEN_KEY)
    setCheckedStorage(true)
    if (!seen) {
      setOpen(true)
    }
  }, [])

  const markSeen = useCallback(() => {
    localStorage.setItem(RAPPORT_ONBOARDING_SEEN_KEY, "true")
  }, [])

  const openWalkthrough = useCallback(() => {
    setOpen(true)
  }, [])

  const value = useMemo(
    () => ({
      openWalkthrough,
    }),
    [openWalkthrough],
  )

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {checkedStorage && (
        <OnboardingWalkthrough
          open={open}
          onClose={() => setOpen(false)}
          onComplete={markSeen}
        />
      )}
    </OnboardingContext.Provider>
  )
}
