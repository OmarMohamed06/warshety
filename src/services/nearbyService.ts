/**
 * nearbyService — works out how far each service center is from the visitor.
 *
 * This is a distance *lookup*, not a second listing. The service centers page
 * already holds the full filtered directory, so replacing it with a separate
 * "nearby" result set would fight every other filter on that page (governorate,
 * make, search, availability). Instead we return an id → kilometres map that
 * the page layers on top of whatever it is already showing.
 *
 * Distance comes from `latitude`/`longitude` only. `maps_link` is a link for
 * humans to open; it is never parsed for coordinates on the web client (a
 * Postgres trigger plus an Edge Function already resolve it server-side).
 *
 * Two paths, one shape out:
 *   • `nearby_vendors` RPC — the same call the mobile app makes, so both
 *     clients agree on distances.
 *   • Client-side haversine over coordinates the page already has — used when
 *     the RPC is unavailable, so a backend hiccup costs ordering accuracy at
 *     worst, never the page.
 */

import { createClient } from "@/lib/supabase/client";
import { haversineKm, hasUsableCoordinates, type Coordinates } from "@/lib/geo";

/** Matches the mobile app: the directory is small and country-wide, so a tight
 *  radius would leave anyone outside Cairo with no distances at all. */
export const NEARBY_RADIUS_KM = 200;
export const NEARBY_MAX_RESULTS = 200;

/** The minimum a center must expose for us to place it. */
export interface LocatableCenter {
  id: string;
  latitude: number | null;
  longitude: number | null;
}

export interface DistanceLookup {
  /** Center id → distance in kilometres. Absent means "no usable location". */
  byId: Map<string, number>;
  /** True when distances were computed locally rather than by the RPC. */
  usedFallback: boolean;
}

/** Distances computed in the browser from coordinates already on the page. */
function localDistances(
  centers: LocatableCenter[],
  origin: Coordinates,
): Map<string, number> {
  const byId = new Map<string, number>();
  for (const c of centers) {
    if (!hasUsableCoordinates(c.latitude, c.longitude)) continue;
    byId.set(c.id, haversineKm(origin.lat, origin.lng, c.latitude!, c.longitude!));
  }
  return byId;
}

/**
 * Distance from `origin` to every center we can place.
 *
 * @param centers The centers currently on the page — used for the fallback and
 *                to keep the result scoped to what is actually being shown.
 */
export async function fetchDistances(
  origin: Coordinates,
  centers: LocatableCenter[],
): Promise<DistanceLookup> {
  // Preferred path — the same RPC the mobile app calls.
  try {
    const supabase = createClient();
    // `as any`: nearby_vendors is not in the generated Database type (which
    // predates it). The RPC is owned by the backend and shared with mobile.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("nearby_vendors", {
      user_lat: origin.lat,
      user_lng: origin.lng,
      radius_km: NEARBY_RADIUS_KM,
      max_results: NEARBY_MAX_RESULTS,
    });

    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) {
      throw new Error("nearby_vendors returned an unexpected shape");
    }

    const byId = new Map<string, number>();
    for (const row of data as Array<Record<string, unknown>>) {
      const id = typeof row.id === "string" ? row.id : null;
      const km =
        typeof row.distance_km === "number"
          ? row.distance_km
          : parseFloat(String(row.distance_km ?? ""));
      if (id && Number.isFinite(km)) byId.set(id, km);
    }

    // A response that places nothing we are showing is not useful — treat it
    // as a miss and fall through rather than blanking every distance.
    if (byId.size > 0) return { byId, usedFallback: false };
    throw new Error("nearby_vendors matched none of the listed centers");
  } catch (rpcErr) {
    console.warn(
      "[nearbyService] nearby_vendors unavailable, measuring locally:",
      rpcErr,
    );
    return { byId: localDistances(centers, origin), usedFallback: true };
  }
}
