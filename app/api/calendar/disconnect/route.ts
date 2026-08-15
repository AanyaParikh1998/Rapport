import { NextResponse } from "next/server"
import { deleteUserIntegration } from "@/lib/user-integrations"

export async function DELETE() {
  try {
    await deleteUserIntegration("google_calendar")
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to disconnect Google Calendar",
      },
      { status: 500 },
    )
  }
}
