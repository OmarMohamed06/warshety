import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Browser-side Supabase client.
 * Safe to use in Client Components and hooks.
 * Module-level singleton — all callers share one instance so that
 * onAuthStateChange listeners and the cookie store are never split.
 */
let _client: SupabaseClient<Database> | null = null;

export function createClient(): SupabaseClient<Database> {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. " +
        "Add them to your Vercel project environment variables and redeploy.",
    );
  }

  _client = createBrowserClient<Database>(url, key);
  return _client;
}
