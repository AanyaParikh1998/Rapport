import { NextResponse } from "next/server"
import { getGoogleAuthUrl } from "@/lib/google-calendar"

export async function GET() {
  try {
    const url = getGoogleAuthUrl()
    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate Google OAuth URL",
      },
      { status: 500 },
    )
  }
}
