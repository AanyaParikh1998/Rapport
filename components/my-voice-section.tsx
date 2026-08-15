"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { VoiceSampleCard } from "@/components/voice-sample-card"
import { VoiceSampleModal } from "@/components/voice-sample-modal"
import { VoiceProfileCard } from "@/components/voice-profile-card"
import { VoiceProfileModal } from "@/components/voice-profile-modal"
import { Button } from "@/components/ui/button"
import {
  deleteVoiceProfile,
  fetchVoiceProfiles,
  type VoiceProfile,
} from "@/lib/voice-profiles"
import {
  deleteVoiceSample,
  fetchVoiceSamples,
  type VoiceSample,
  type VoiceSampleType,
} from "@/lib/voice-samples"

type MainTab = "email" | "linkedin"
type LinkedInSubTab = "linkedin_note" | "linkedin_message"

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: "email", label: "Emails" },
  { id: "linkedin", label: "LinkedIn" },
]

const LINKEDIN_SUB_TABS: {
  id: LinkedInSubTab
  label: string
  subtitle: string
  addLabel: string
  emptyTitle: string
  emptyDescription: string
}[] = [
  {
    id: "linkedin_note",
    label: "Notes",
    subtitle: "Add connection request notes you've sent and Rapport will learn your style",
    addLabel: "Add sample note",
    emptyTitle: "No sample LinkedIn notes yet",
    emptyDescription:
      "Add 3-5 connection request notes to teach Rapport how you write short, punchy outreach.",
  },
  {
    id: "linkedin_message",
    label: "Messages",
    subtitle: "Add LinkedIn messages you've sent and Rapport will learn your style",
    addLabel: "Add sample message",
    emptyTitle: "No sample LinkedIn messages yet",
    emptyDescription:
      "Add 3-5 sent LinkedIn messages to teach Rapport your tone for existing connections.",
  },
]

const EMAIL_TAB = {
  subtitle: "Add 3-5 emails you've written before and Rapport will learn your style",
  addLabel: "Add sample email",
  emptyTitle: "No sample emails yet",
  emptyDescription:
    "Add 3-5 sent emails to teach Rapport how you write. Try to include a cold outreach, a warm reconnect, and a follow-up for best results.",
}

export function MyVoiceSection() {
  const [samples, setSamples] = useState<VoiceSample[]>([])
  const [profiles, setProfiles] = useState<VoiceProfile[]>([])
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("email")
  const [activeLinkedInSubTab, setActiveLinkedInSubTab] = useState<LinkedInSubTab>("linkedin_note")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSample, setEditingSample] = useState<VoiceSample | null>(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<VoiceProfile | null>(null)

  const activeSampleType: VoiceSampleType =
    activeMainTab === "email" ? "email" : activeLinkedInSubTab

  const linkedInSubTabConfig = LINKEDIN_SUB_TABS.find((tab) => tab.id === activeLinkedInSubTab)!
  const tabConfig = activeMainTab === "email" ? EMAIL_TAB : linkedInSubTabConfig

  const tabSamples = samples.filter((sample) => sample.type === activeSampleType)

  const profileNameById = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.id, profile.name]))
  }, [profiles])

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const [sampleData, profileData] = await Promise.all([
          fetchVoiceSamples(),
          fetchVoiceProfiles(),
        ])
        if (!cancelled) {
          setSamples(sampleData)
          setProfiles(profileData)
          setLoadError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load voice data")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  function openAddModal() {
    setEditingSample(null)
    setModalOpen(true)
  }

  function openEditModal(sample: VoiceSample) {
    setEditingSample(sample)
    setModalOpen(true)
  }

  function openNewProfileModal() {
    setEditingProfile(null)
    setProfileModalOpen(true)
  }

  function openEditProfileModal(profile: VoiceProfile) {
    setEditingProfile(profile)
    setProfileModalOpen(true)
  }

  function handleSaved(sample: VoiceSample) {
    setSamples((current) => {
      const existingIndex = current.findIndex((item) => item.id === sample.id)
      if (existingIndex === -1) return [sample, ...current]
      return current.map((item) => (item.id === sample.id ? sample : item))
    })
  }

  function handleProfileSaved(profile: VoiceProfile) {
    setProfiles((current) => {
      const existingIndex = current.findIndex((item) => item.id === profile.id)
      if (existingIndex === -1) return [...current, profile]
      return current.map((item) => (item.id === profile.id ? profile : item))
    })
  }

  async function handleDelete(id: string) {
    await deleteVoiceSample(id)
    setSamples((current) => current.filter((item) => item.id !== id))
  }

  async function handleDeleteProfile(id: string) {
    await deleteVoiceProfile(id)
    setProfiles((current) => current.filter((item) => item.id !== id))
    setSamples((current) =>
      current.map((sample) =>
        sample.profileId === id ? { ...sample, profileId: null } : sample,
      ),
    )
  }

  function getProfileCounts(profileId: string) {
    const profileSamples = samples.filter((sample) => sample.profileId === profileId)
    return {
      emailCount: profileSamples.filter((sample) => sample.type === "email").length,
      noteCount: profileSamples.filter((sample) => sample.type === "linkedin_note").length,
      messageCount: profileSamples.filter((sample) => sample.type === "linkedin_message").length,
    }
  }

  return (
    <>
      <p className="mb-4 text-[11px] text-muted-foreground">{tabConfig.subtitle}</p>

      {loadError ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          {loadError}
        </p>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMainTab(tab.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] transition-colors",
                  activeMainTab === tab.id
                    ? "bg-background font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeMainTab === "linkedin" ? (
            <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
              {LINKEDIN_SUB_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveLinkedInSubTab(tab.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[12px] transition-colors",
                    activeLinkedInSubTab === tab.id
                      ? "bg-background font-medium text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <Button size="sm" onClick={openAddModal}>
          <Plus data-icon="inline-start" />
          {tabConfig.addLabel}
        </Button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-[13px] text-muted-foreground">Loading samples...</p>
      ) : (
        <>
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">Profiles</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Group samples by context, like VC outreach or alumni reconnects.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={openNewProfileModal}>
                <Plus data-icon="inline-start" />
                New profile
              </Button>
            </div>

            {profiles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <p className="text-[12px] text-muted-foreground">
                  No profiles yet. Create one to organize your writing samples.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {profiles.map((profile) => {
                  const counts = getProfileCounts(profile.id)
                  return (
                    <VoiceProfileCard
                      key={profile.id}
                      profile={profile}
                      emailCount={counts.emailCount}
                      noteCount={counts.noteCount}
                      messageCount={counts.messageCount}
                      onEdit={openEditProfileModal}
                      onDelete={handleDeleteProfile}
                    />
                  )
                })}
              </div>
            )}
          </section>

          {tabSamples.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-[13px] font-medium text-foreground">{tabConfig.emptyTitle}</p>
              <p className="mt-1 max-w-md text-[12px] text-muted-foreground">
                {tabConfig.emptyDescription}
              </p>
              <Button size="sm" className="mt-4" onClick={openAddModal}>
                <Plus data-icon="inline-start" />
                {tabConfig.addLabel}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tabSamples.map((sample) => (
                <VoiceSampleCard
                  key={sample.id}
                  sample={sample}
                  profileName={
                    sample.profileId ? profileNameById.get(sample.profileId) ?? null : null
                  }
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
          <p className="mt-4 text-[11px] text-muted-foreground">
            3-5 samples recommended for best results
          </p>
        </>
      )}

      <VoiceSampleModal
        open={modalOpen}
        sample={editingSample}
        sampleType={activeSampleType}
        profiles={profiles}
        onClose={() => {
          setModalOpen(false)
          setEditingSample(null)
        }}
        onSaved={handleSaved}
      />

      <VoiceProfileModal
        open={profileModalOpen}
        profile={editingProfile}
        onClose={() => {
          setProfileModalOpen(false)
          setEditingProfile(null)
        }}
        onSaved={handleProfileSaved}
      />
    </>
  )
}
