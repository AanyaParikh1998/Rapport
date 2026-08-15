import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
  )
}

// Cache on globalThis so Next.js dev Fast Refresh reuses the same client
// instead of constructing a new GoTrueClient on every module re-evaluation.
declare global {
  // eslint-disable-next-line no-var
  var __supabaseBrowserClient: SupabaseClient | undefined
}

export const supabase =
  globalThis.__supabaseBrowserClient ?? createClient(supabaseUrl, supabaseAnonKey)

if (process.env.NODE_ENV !== "production") {
  globalThis.__supabaseBrowserClient = supabase
}
