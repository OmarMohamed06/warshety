import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { completeDebug, logDebug } from "@/lib/debug-log";

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

  // Short, readable label for the diagnostic overlay: "GET bookings", etc.
  const url = typeof input === "string" ? input : String(input);
  const label = `${method} ${url.replace(/^.*\/(rest|auth)\/v1\//, "").split("?")[0]}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startedAt = Date.now();
    const logId = logDebug(
      "request",
      attempt > 1 ? `${label} (retry)` : label,
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    // Honour a caller-supplied signal (auth-js and realtime pass their own)
    // by forwarding its abort to ours.
    const callerSignal = init?.signal;
    const onCallerAbort = () => controller.abort();
    callerSignal?.addEventListener("abort", onCallerAbort, { once: true });

    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      completeDebug(logId, res.status, Date.now() - startedAt);
      return res;
    } catch (err) {
      lastError = err;
      completeDebug(
        logId,
        controller.signal.aborted ? "TIMEOUT" : "NETWORK-ERR",
        Date.now() - startedAt,
      );
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

/**
 * How long to wait for the cross-tab auth lock before giving up on it.
 */
const LOCK_ACQUIRE_TIMEOUT_MS = 5_000;

/** Unique sentinel so a real result can never be mistaken for "gave up". */
const GAVE_UP = Symbol("gave-up");

/**
 * Structural shape of the Web Locks API we use. Declared locally rather than
 * relying on `LockManager` being present in the DOM lib.
 */
type LockRequester = {
  request: (
    name: string,
    options: { mode: "exclusive"; signal: AbortSignal },
    fn: () => Promise<unknown>,
  ) => Promise<unknown>;
};

/**
 * Replacement for supabase-js's default `navigator.locks` auth lock.
 *
 * WHY THIS EXISTS — this is the bug that froze whole pages:
 *
 * Every Supabase query calls `auth.getSession()` to build its Authorization
 * header, and `getSession()` begins with an UNBOUNDED `await
 * this.initializePromise`. That promise resolves only once the client has
 * acquired a Web Lock named after the auth storage key. Web Locks are shared
 * across every tab on the origin, so if any tab (or a tab the browser froze
 * mid-operation) holds that lock and never releases it, `initializePromise`
 * never settles — and from that moment *every query on every page* of the app
 * hangs forever with no error. The UI keeps its skeletons up until a reload
 * creates a fresh client. That matches the reported symptom exactly: one page
 * gets stuck, and afterwards every page you navigate to is stuck too.
 *
 * The library's own timeout does not save us here: it relies on the abort
 * signal rejecting the pending `locks.request()`, which is not dependable
 * (notably in Safari). So we race the acquisition ourselves and, if the lock
 * does not arrive in time, run the operation WITHOUT it.
 *
 * Losing the lock is a mild, well-understood trade-off — two tabs may refresh
 * the token at the same time, which Supabase tolerates via its refresh-token
 * reuse interval. A permanently frozen app is not a trade-off at all.
 */
async function resilientLock<R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  const locks = (
    globalThis.navigator as unknown as { locks?: LockRequester } | undefined
  )?.locks;

  // Environment without Web Locks — nothing to coordinate with.
  if (!locks) return await fn();

  const timeout = acquireTimeout > 0 ? acquireTimeout : LOCK_ACQUIRE_TIMEOUT_MS;

  let acquired = false;
  let gaveUp = false;

  let settle!: (value: R) => void;
  let fail!: (err: unknown) => void;
  const running = new Promise<R>((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), timeout);

  void locks
    .request(name, { mode: "exclusive", signal: controller.signal }, async () => {
      // The lock finally arrived, but we already went ahead without it.
      // Returning immediately releases it again without running fn twice.
      if (gaveUp) return;
      acquired = true;
      clearTimeout(abortTimer);
      try {
        settle(await fn());
      } catch (err) {
        fail(err);
      }
    })
    .catch(() => {
      // Acquisition was aborted or rejected — the deadline below handles it.
    });

  const deadline = new Promise<typeof GAVE_UP>((resolve) =>
    setTimeout(() => resolve(GAVE_UP), timeout),
  );

  const outcome = await Promise.race([running, deadline]);

  if (outcome !== GAVE_UP) return outcome as R;

  // Deadline hit. If the lock was granted after all, fn is already running —
  // just wait for it.
  if (acquired) return await running;

  gaveUp = true;
  clearTimeout(abortTimer);
  logDebug(
    "note",
    `auth lock unavailable after ${timeout}ms — proceeding without it`,
  );
  console.warn(
    `[supabase] auth lock '${name}' could not be acquired in ${timeout}ms — ` +
      "continuing without it to avoid freezing every query",
  );
  return await fn();
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
    auth: { lock: resilientLock },
  });
  return _client;
}
