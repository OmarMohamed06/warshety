import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Works like useState but persists the value in localStorage under `key`.
 * Writes are debounced (500 ms) so rapid state changes (e.g. typing) don't
 * thrash localStorage on every keystroke.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Always start with initialValue so server and client render the same HTML.
  // After mount we hydrate from localStorage to avoid SSR/client mismatch.
  const [state, setInternalState] = useState<T>(initialValue);
  const hydrated = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        setInternalState(JSON.parse(stored) as T);
      }
    } catch {
      // ignore
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Debounced localStorage write — waits 500 ms after the last change
  useEffect(() => {
    if (!hydrated.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // ignore quota errors
      }
    }, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, state]);

  const setState = useCallback((value: T | ((prev: T) => T)) => {
    setInternalState((prev) => {
      const next =
        typeof value === "function" ? (value as (p: T) => T)(prev) : value;
      return next;
    });
  }, []);

  /** Call this to wipe the saved draft and reset to initialValue */
  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setInternalState(initialValue);
  }, [key, initialValue]);

  return [state, setState, clear];
}
