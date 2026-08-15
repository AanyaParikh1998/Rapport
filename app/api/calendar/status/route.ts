import { NextResponse } from "next/server"
import { isGoogleCalendarConnected } from "@/lib/user-integrations"

export async function GET() {
  try {
    const connected = await isGoogleCalendarConnected()
    return NextResponse.json({ connected })
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Failed to check calendar status",
      },
      { status: 500 },
    )
  }
}
