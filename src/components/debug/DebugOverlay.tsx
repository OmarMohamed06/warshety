"use client";

/**
 * DebugOverlay — on-screen diagnostic panel for the "page renders but data
 * never arrives" bug.
 *
 * Enable:  add ?debug=1 to any URL (sticks via localStorage)
 * Disable: add ?debug=0
 *
 * It answers the one question that separates the possible causes:
 * when a page is stuck on skeletons, did it even *ask* for data?
 *
 *   • Requests listed, one stuck on "…"  → the network request is hanging.
 *   • Requests listed, all completed OK  → data arrived; the UI is not reacting.
 *   • NO requests at all                 → the page's effect never ran
 *                                          (auth gate, or the JS never hydrated).
 *
 * The auth line at the top shows whether the page is being gated by auth.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getDebugEntries,
  isDebugEnabled,
  subscribeDebug,
  type DebugEntry,
} from "@/lib/debug-log";
import { useAuth } from "@/context/AuthContext";

/** Stable empty snapshot for SSR — must not be re-created per call. */
const EMPTY: readonly DebugEntry[] = [];

function useDebugEntries(): readonly DebugEntry[] {
  return useSyncExternalStore(subscribeDebug, getDebugEntries, () => EMPTY);
}

export function DebugOverlay() {
  const { isLoading, session, user, vendor, role } = useAuth();
  const entries = useDebugEntries();
  const [enabled, setEnabled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // Re-render every second so in-flight requests show a growing age.
  const [, setTick] = useState(0);

  // localStorage is not available during SSR — decide after mount.
  useEffect(() => {
    setEnabled(isDebugEnabled());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  const pending = entries.filter((e) => e.kind === "request" && !e.status);

  return (
    <div
      dir="ltr"
      className="fixed bottom-2 left-2 z-[9999] max-w-[92vw] w-[420px] rounded-lg border border-slate-700 bg-slate-900/95 text-slate-100 shadow-xl font-mono text-[11px] leading-tight"
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-700"
      >
        <span className="font-bold">
          debug{pending.length > 0 ? ` · ${pending.length} in flight` : ""}
        </span>
        <span className="opacity-60">{collapsed ? "▲" : "▼"}</span>
      </button>

      {!collapsed && (
        <div className="p-3 space-y-2 max-h-[45vh] overflow-auto">
          <div className="space-y-0.5">
            <div className="opacity-60">auth</div>
            <div>
              isLoading=<b>{String(isLoading)}</b> session=
              <b>{String(!!session)}</b> user=<b>{String(!!user)}</b> vendor=
              <b>{String(!!vendor)}</b> role=<b>{role ?? "—"}</b>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="opacity-60">
              requests (newest first) — {entries.length} recorded
            </div>
            {entries.length === 0 && (
              <div className="text-amber-300">
                none — nothing has asked for data on this page
              </div>
            )}
            {entries.map((e) => {
              const age = ((Date.now() - e.at) / 1000).toFixed(1);

              // Auth events and notes are instants, not requests — they never
              // "complete", so never render them as pending.
              if (e.kind !== "request") {
                return (
                  <div key={e.id} className="text-sky-300">
                    {age}s ago · {e.label}
                  </div>
                );
              }

              const done = e.status !== undefined;
              const bad =
                done &&
                (typeof e.status === "string" || Number(e.status) >= 400);
              return (
                <div
                  key={e.id}
                  className={
                    !done
                      ? "text-amber-300"
                      : bad
                        ? "text-red-400"
                        : "text-slate-300"
                  }
                >
                  {done ? `${e.status} ${e.ms}ms` : `… pending ${age}s`} ·{" "}
                  {e.label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
