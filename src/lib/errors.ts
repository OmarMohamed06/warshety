/**
 * Turns raw backend/network failures into something a customer can act on.
 *
 * Supabase surfaces things like `duplicate key value violates unique
 * constraint "users_email_key"` or `JWT expired`. Those are useful in a log
 * and useless — often alarming — in the UI. Everything user-facing should go
 * through `friendlyError()`; keep the raw text for `console.error`.
 */

/** Stable identifiers, each backed by an `errors.*` entry in messages/*.json */
export type ErrorKey =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "emailTaken"
  | "rateLimited"
  | "duplicate"
  | "inUse"
  | "validation"
  | "payment"
  | "server"
  | "unknown";

/** English copy, also the fallback when no translator is supplied. */
const FALLBACK: Record<ErrorKey, string> = {
  network:
    "We couldn't reach the server. Check your internet connection and try again.",
  timeout: "That took longer than expected. Please try again.",
  unauthorized: "Your session has expired. Please sign in again.",
  forbidden: "You don't have permission to do that.",
  notFound: "We couldn't find what you were looking for.",
  invalidCredentials: "The email or password you entered is incorrect.",
  emailNotConfirmed:
    "Please confirm your email address first — check your inbox for the link.",
  emailTaken: "An account with this email already exists. Try signing in.",
  rateLimited: "Too many attempts. Please wait a moment and try again.",
  duplicate: "That already exists. Try a different value.",
  inUse: "This item is still being used elsewhere, so it can't be removed.",
  validation: "Some of the details entered aren't valid. Please review them.",
  payment: "The payment couldn't be completed. Please try another method.",
  server: "Something went wrong on our end. Please try again in a moment.",
  unknown: "Something went wrong. Please try again.",
};

/** Errors worth offering a "Try again" button for. */
const RETRYABLE: ReadonlySet<ErrorKey> = new Set<ErrorKey>([
  "network",
  "timeout",
  "rateLimited",
  "server",
  "unknown",
]);

interface ErrorLike {
  message?: unknown;
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
  name?: unknown;
  error_description?: unknown;
}

function readRaw(error: unknown): {
  message: string;
  code: string;
  status: number | null;
} {
  if (typeof error === "string") {
    return { message: error.toLowerCase(), code: "", status: null };
  }
  if (!error || typeof error !== "object") {
    return { message: "", code: "", status: null };
  }

  const e = error as ErrorLike;
  const message = [e.message, e.error_description, e.name]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();

  const code = typeof e.code === "string" ? e.code.toLowerCase() : "";
  const rawStatus = e.status ?? e.statusCode;
  const status = typeof rawStatus === "number" ? rawStatus : null;

  return { message, code, status };
}

/**
 * Classify an unknown thrown value into an `ErrorKey`.
 *
 * Ordered most-specific first: a 400 that says "invalid login credentials"
 * should read as bad credentials, not as generic validation.
 */
export function getErrorKey(error: unknown): ErrorKey {
  const { message, code, status } = readRaw(error);
  const has = (...needles: string[]) => needles.some((n) => message.includes(n));

  // ── Offline / transport ────────────────────────────────────────────────
  if (
    has("failed to fetch", "networkerror", "network request failed", "econnrefused", "enotfound", "fetch failed") ||
    code === "econnrefused" ||
    code === "enotfound"
  ) {
    return "network";
  }
  if (has("timeout", "timed out", "aborterror") || code === "etimedout" || status === 408) {
    return "timeout";
  }

  // ── Auth ───────────────────────────────────────────────────────────────
  if (has("invalid login credentials", "invalid credentials", "invalid email or password")) {
    return "invalidCredentials";
  }
  if (has("email not confirmed", "email_not_confirmed")) return "emailNotConfirmed";
  if (has("already registered", "user already exists", "email address is already")) {
    return "emailTaken";
  }
  if (has("rate limit", "too many requests", "email rate") || status === 429) {
    return "rateLimited";
  }
  if (has("jwt expired", "invalid jwt", "not authenticated", "session missing") || status === 401) {
    return "unauthorized";
  }

  // ── Postgres / PostgREST ───────────────────────────────────────────────
  // 23505 unique violation, 23503 FK violation, 23502/23514 constraint,
  // 42501 insufficient privilege, PGRST116 no rows returned.
  if (code === "23505" || has("duplicate key", "already exists")) return "duplicate";
  if (code === "23503" || has("foreign key constraint", "still referenced")) return "inUse";
  if (code === "23502" || code === "23514" || code === "22p02" || has("violates check constraint", "invalid input syntax")) {
    return "validation";
  }
  if (code === "42501" || code === "pgrst301" || has("row-level security", "permission denied") || status === 403) {
    return "forbidden";
  }
  if (code === "pgrst116" || has("no rows", "not found") || status === 404) {
    return "notFound";
  }

  if (has("payment", "card declined", "paymob")) return "payment";
  if (status !== null && status >= 500) return "server";
  if (status === 400 || status === 422) return "validation";

  return "unknown";
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * The message to show the user.
 *
 * Pass the `t` from `useLanguage()` in client components so the copy is
 * localised; without it you get the English fallback.
 */
export function friendlyError(error: unknown, t?: Translate): string {
  const key = getErrorKey(error);
  if (!t) return FALLBACK[key];
  const translated = t(`errors.${key}`);
  // `t` echoes the key back when a string is missing — don't show that.
  return translated === `errors.${key}` ? FALLBACK[key] : translated;
}

/** Whether the UI should offer a retry affordance for this failure. */
export function isRetryable(error: unknown): boolean {
  return RETRYABLE.has(getErrorKey(error));
}

/**
 * Log the real error, return the friendly one. Use at the boundary of a
 * catch block so debuggability isn't traded away for nicer copy.
 */
export function reportError(
  scope: string,
  error: unknown,
  t?: Translate,
): string {
  console.error(`[${scope}]`, error);
  return friendlyError(error, t);
}
