"use client"

import { GlobalSearchProvider } from "@/components/global-search"
import { OnboardingProvider } from "@/components/onboarding-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GlobalSearchProvider>
      <OnboardingProvider>{children}</OnboardingProvider>
    </GlobalSearchProvider>
  )
}
