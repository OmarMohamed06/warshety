/**
 * Lightweight in-page diagnostic log.
 *
 * WHY: the "page renders but data never arrives, reload fixes it" bug is
 * intermittent and only reproduces in the browser, so we need the app itself
 * to record what happened. Every Supabase request and every auth event is
 * appended here; DebugOverlay renders the buffer on screen.
 *
 * Costs nothing when disabled: entries are still recorded (a bounded array of
 * plain objects), but nothing renders and nothing is sent anywhere.
 */

export type DebugEntry = {
  id: number;
  at: number;
  kind: "request" | "auth" | "note";
  label: string;
  /** Populated for requests once they settle. */
  status?: number | string;
  /** Milliseconds; undefined while a request is still in flight. */
  ms?: number;
};

const MAX_ENTRIES = 40;

let nextId = 1;
let entries: DebugEntry[] = [];
const listeners = new Set<() => void>();

/**
 * useSyncExternalStore only re-renders when the snapshot's identity changes,
 * so every mutation must produce a brand-new array (and a new entry object).
 */
function emit() {
  entries = entries.slice();
  for (const l of listeners) l();
}

/** Append an entry and return its id so it can be completed later. */
export function logDebug(
  kind: DebugEntry["kind"],
  label: string,
  extra?: Partial<DebugEntry>,
): number {
  const id = nextId++;
  entries = [{ id, at: Date.now(), kind, label, ...extra }, ...entries].slice(
    0,
    MAX_ENTRIES,
  );
  emit();
  return id;
}

/** Fill in the outcome of an in-flight request. */
export function completeDebug(
  id: number,
  status: number | string,
  ms: number,
): void {
  const idx = entries.findIndex((x) => x.id === id);
  if (idx === -1) return;
  entries = entries.slice();
  entries[idx] = { ...entries[idx], status, ms };
  emit();
}

export function getDebugEntries(): readonly DebugEntry[] {
  return entries;
}

export function subscribeDebug(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** True when the visitor asked for the overlay (?debug=1 or localStorage). */
export function isDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const param = new URLSearchParams(window.location.search).get("debug");
    if (param === "1") {
      window.localStorage.setItem("warshety.debug", "1");
      return true;
    }
    if (param === "0") {
      window.localStorage.removeItem("warshety.debug");
      return false;
    }
    return window.localStorage.getItem("warshety.debug") === "1";
  } catch {
    return false;
  }
}
