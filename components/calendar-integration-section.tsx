"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const GMAIL_LAST_SYNCED_KEY = "gmailLastSyncedAt"

function formatSyncedAt(isoDate: string | null): string | null {
  if (!isoDate) return null

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function CalendarIntegrationSection() {
  const searchParams = useSearchParams()
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailAuthorized, setGmailAuthorized] = useState(false)
  const [gmailLastSyncedAt, setGmailLastSyncedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justConnected, setJustConnected] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetch("/api/calendar/status").then((response) => response.json()),
      fetch("/api/gmail/status").then((response) => response.json()),
    ])
      .then(([calendarData, gmailData]) => {
        if (!cancelled) {
          setCalendarConnected(Boolean(calendarData.connected))
          setGmailConnected(Boolean(calendarData.connected))
          setGmailAuthorized(Boolean(gmailData.connected))
          setGmailLastSyncedAt(window.localStorage.getItem(GMAIL_LAST_SYNCED_KEY))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCalendarConnected(false)
          setGmailConnected(false)
          setGmailAuthorized(false)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const calendarStatus = searchParams.get("calendar")
    if (calendarStatus === "connected") {
      setCalendarConnected(true)
      setGmailConnected(true)
      setGmailAuthorized(true)
      setJustConnected(true)
    }
    if (calendarStatus === "error") {
      setError("Failed to connect Google. Please try again.")
    }
  }, [searchParams])

  async function handleConnect() {
    setConnecting(true)
    setError(null)

    try {
      const response = await fetch("/api/calendar/auth")
      const data = await response.json()

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Failed to start Google connection")
      }

      window.location.href = data.url
    } catch (connectError) {
      setError(
        connectError instanceof Error ? connectError.message : "Failed to connect Google",
      )
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    setError(null)

    try {
      const response = await fetch("/api/calendar/disconnect", { method: "DELETE" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to disconnect Google")
      }

      setCalendarConnected(false)
      setGmailConnected(false)
      setGmailAuthorized(false)
      setGmailLastSyncedAt(null)
      window.localStorage.removeItem(GMAIL_LAST_SYNCED_KEY)
      setJustConnected(false)
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Failed to disconnect Google",
      )
    } finally {
      setDisconnecting(false)
    }
  }

  const gmailSyncedLabel = formatSyncedAt(gmailLastSyncedAt)
  const needsGmailReconnect = gmailConnected && !gmailAuthorized

  return (
    <section className="mb-8 max-w-xl rounded-lg border border-border bg-card p-4">
      <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        Integrations
      </h2>

      <div className="mt-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-foreground">Google Calendar</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Match upcoming and recent calls with contacts on your pipeline.
            </p>
          </div>

          {loading ? (
            <span className="text-[12px] text-muted-foreground">Checking...</span>
          ) : calendarConnected ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Calendar connected
            </span>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleConnect()}
              disabled={connecting}
            >
              {connecting ? "Connecting..." : "Connect Google Calendar"}
            </Button>
          )}
        </div>

        <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
          <div>
            <p className="text-[13px] font-medium text-foreground">Gmail</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Detect emails sent to and received from pipeline contacts.
            </p>
            {gmailAuthorized && gmailSyncedLabel ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Last synced {gmailSyncedLabel}
              </p>
            ) : null}
          </div>

          {loading ? (
            <span className="text-[12px] text-muted-foreground">Checking...</span>
          ) : gmailAuthorized ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Gmail connected
            </span>
          ) : needsGmailReconnect ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleConnect()}
              disabled={connecting}
            >
              {connecting ? "Connecting..." : "Connect Gmail"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleConnect()}
              disabled={connecting}
            >
              {connecting ? "Connecting..." : "Connect Gmail"}
            </Button>
          )}
        </div>
      </div>

      {calendarConnected || gmailAuthorized ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void handleDisconnect()}
            disabled={disconnecting}
            className="text-[11px] text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect Google"}
          </button>
        </div>
      ) : null}

      {justConnected ? (
        <p className="mt-3 text-[12px] font-medium text-emerald-600">
          Google connected successfully.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
