import { NextResponse } from "next/server"

export const ANTHROPIC_OVERLOAD_ERROR_MESSAGE =
  "Claude is temporarily busy. Please wait a moment and try again."

type AnthropicErrorBody = {
  type?: string
  error?: {
    type?: string
    message?: string
  }
}

export function isAnthropicOverloadError(errorBody: string): boolean {
  try {
    const parsed = JSON.parse(errorBody) as AnthropicErrorBody
    return parsed.error?.type === "overloaded_error"
  } catch {
    return errorBody.includes("overloaded_error")
  }
}

export function getAnthropicHttpErrorMessage(
  status: number,
  errorBody: string,
): { message: string; status: number } {
  if (isAnthropicOverloadError(errorBody)) {
    return { message: ANTHROPIC_OVERLOAD_ERROR_MESSAGE, status: 503 }
  }

  try {
    const parsed = JSON.parse(errorBody) as AnthropicErrorBody
    const message = parsed.error?.message?.trim()
    if (message) {
      return { message, status }
    }
  } catch {
    // Fall through to generic message.
  }

  return { message: "Failed to process request. Please try again.", status }
}

export function anthropicErrorResponse(status: number, errorBody: string): NextResponse {
  const { message, status: responseStatus } = getAnthropicHttpErrorMessage(status, errorBody)
  return NextResponse.json({ error: message }, { status: responseStatus })
}
