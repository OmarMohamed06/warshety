"use client";

/**
 * useGeolocation — one-shot browser geolocation with explicit, inspectable state.
 *
 * Deliberately NOT a `watchPosition` wrapper: continuous tracking costs battery
 * and keeps a precise location live for no benefit here. The caller asks once,
 * and offers the user an explicit "update my location" control afterwards.
 *
 * Nothing is requested on mount. `request()` must be called from a user
 * gesture, so the browser's permission prompt is always something the visitor
 * asked for.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Coordinates } from "@/lib/geo";

export type GeoStatus =
  /** Nothing requested yet. */
  | "idle"
  /** Waiting on the browser (prompt may be showing). */
  | "requesting"
  /** Coordinates in hand. */
  | "granted"
  /** The visitor refused, or refused earlier and the browser remembers. */
  | "denied"
  /** The device could not produce a fix. */
  | "unavailable"
  /** The request ran past its deadline. */
  | "timeout"
  /** This browser has no Geolocation API. */
  | "unsupported"
  /** Page is not on HTTPS (or localhost), so the API is unavailable. */
  | "insecure";

export interface GeolocationState {
  status: GeoStatus;
  coords: Coordinates | null;
  /** Browser permission as reported by the Permissions API, when available. */
  permission: PermissionState | "unknown";
  /** True while a fix is being obtained. */
  loading: boolean;
  /**
   * Ask for a fix. Resolves with the coordinates, or null for every failure
   * mode (the reason lands in `status`). Never rejects, so callers can simply
   * `await` it from a click handler and branch on the result — which keeps the
   * fetch that follows out of an effect.
   */
  request: () => Promise<Coordinates | null>;
  /** Drop the fix and return to idle (used by "stop using my location"). */
  clear: () => void;
}

const TIMEOUT_MS = 20_000;

/** Why the platform cannot serve a request at all, if that is the case. */
function environmentBlocker(): GeoStatus | null {
  if (typeof window === "undefined") return null;
  // Geolocation is gated on secure contexts. localhost counts as secure, so
  // this only trips on a genuinely insecure origin (plain http:// in prod).
  if (!window.isSecureContext) return "insecure";
  if (!("geolocation" in navigator)) return "unsupported";
  return null;
}

export function useGeolocation(): GeolocationState {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [permission, setPermission] = useState<PermissionState | "unknown">(
    "unknown",
  );

  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Read the stored permission WITHOUT triggering a prompt, so the UI can say
  // "you previously blocked location" before the visitor clicks anything.
  // The Permissions API is absent in some browsers (older Safari); that is
  // fine, we simply stay at "unknown" and find out by asking.
  useEffect(() => {
    let cancelled = false;
    let subscribed: PermissionStatus | null = null;

    async function readPermission() {
      if (typeof navigator === "undefined" || !navigator.permissions?.query) {
        return;
      }
      try {
        const result = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        if (cancelled) return;
        subscribed = result;
        setPermission(result.state);
        if (result.state === "denied") setStatus("denied");
        // Reflect the visitor un-blocking us in site settings without a reload.
        result.onchange = () => {
          if (cancelled) return;
          setPermission(result.state);
          if (result.state === "denied") setStatus("denied");
          else if (result.state === "granted") setStatus((s) => s);
        };
      } catch {
        // Some browsers reject the "geolocation" descriptor outright.
      }
    }

    readPermission();
    return () => {
      cancelled = true;
      if (subscribed) subscribed.onchange = null;
    };
  }, []);

  const request = useCallback((): Promise<Coordinates | null> => {
    const blocker = environmentBlocker();
    if (blocker) {
      setStatus(blocker);
      return Promise.resolve(null);
    }
    if (inFlightRef.current) return Promise.resolve(null);

    inFlightRef.current = true;
    setStatus("requesting");

    return new Promise<Coordinates | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
        inFlightRef.current = false;
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!mountedRef.current) return resolve(null);
        setCoords(next);
        setPermission("granted");
        setStatus("granted");
        resolve(next);
      },
      (err) => {
        inFlightRef.current = false;
        if (!mountedRef.current) return resolve(null);
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
          setStatus("denied");
        } else if (err.code === err.TIMEOUT) {
          setStatus("timeout");
        } else {
          setStatus("unavailable");
        }
        resolve(null);
      },
        {
          enableHighAccuracy: true,
          timeout: TIMEOUT_MS,
          // Always take a fresh reading: a cached fix from another site's
          // request could be hours old and miles away.
          maximumAge: 0,
        },
      );
    });
  }, []);

  const clear = useCallback(() => {
    setCoords(null);
    setStatus("idle");
  }, []);

  return {
    status,
    coords,
    permission,
    loading: status === "requesting",
    request,
    clear,
  };
}
