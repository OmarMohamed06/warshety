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

/**
 * How long a single browser→Supabase request may stay in flight before we
 * abort it.
 *
 * WHY THIS EXISTS: `fetch()` has no default timeout. If the browser's
 * connection to Supabase goes stale (Wi-Fi switch, sleep/wake, dead HTTP/2
 * connection, cold Supabase instance), the request neither resolves nor
 * rejects — it hangs forever. Every page in this app renders a skeleton while
 * `loading === true` and only clears it in a `finally` block, so a single
 * hung request freezes that page's data until a full reload. This bounds it.
 */
const REQUEST_TIMEOUT_MS = 12_000;

/** Requests we may safely re-issue: no side effects on the server. */
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Pause between the first attempt and the retry. */
const RETRY_DELAY_MS = 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch() with an abort-based timeout and a single retry for reads.
 *
 * A stalled connection is usually cured by re-issuing the request (the browser
 * opens a fresh connection), so the retry makes the common case invisible to
 * the user. Writes (POST/PATCH/PUT/DELETE) are never retried — the first
 * attempt may have reached the server, and replaying it could duplicate a
 * booking, a payment or a status change.
 */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const canRetry = IDEMPOTENT_METHODS.has(method);
  const maxAttempts = canRetry ? 2 : 1;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    // Honour a caller-supplied signal (auth-js and realtime pass their own)
    // by forwarding its abort to ours.
    const callerSignal = init?.signal;
    const onCallerAbort = () => controller.abort();
    callerSignal?.addEventListener("abort", onCallerAbort, { once: true });

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (err) {
      lastError = err;
      // The caller aborted on purpose (component unmounted, etc.) — respect it.
      if (callerSignal?.aborted) throw err;

      if (attempt < maxAttempts) {
        console.warn(
          `[supabase] ${method} request stalled or failed — retrying once`,
          typeof input === "string" ? input : String(input),
        );
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.error(
        `[supabase] ${method} request failed after ${attempt} attempt(s)`,
        err,
      );
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", onCallerAbort);
    }
  }

  throw lastError;
}

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

  _client = createBrowserClient<Database>(url, key, {
    global: { fetch: fetchWithTimeout },
  });
  return _client;
}
