/**
 * nearbyService — reads approved service centers, optionally ranked by distance
 * from the visitor.
 *
 * Distance comes from `latitude`/`longitude` only. `maps_link` is a link for
 * humans to open; it is never parsed for coordinates on the web client (a
 * Postgres trigger plus an Edge Function already resolve it server-side).
 *
 * Two paths, one shape out:
 *   • `nearby_vendors` RPC — the same call the mobile app makes. It filters to
 *     approved, drops NULL and (0,0) coordinates, applies the radius, and sorts
 *     nearest first, so both clients agree on what "near" means.
 *   • Plain directory read — used when no location is available, and as a
 *     fallback when the RPC fails. Distances are then computed client-side so a
 *     backend hiccup degrades to a working list rather than an error screen.
 *
 * The UI only ever sees NearbyCenter[], so a future server-side search can
 * replace either path without touching a component.
 */

import { createClient } from "@/lib/supabase/client";
import { haversineKm, hasUsableCoordinates, type Coordinates } from "@/lib/geo";

/** Matches the mobile app: the directory is small and country-wide, so a tight
 *  radius would show an empty list to anyone outside Cairo. */
export const NEARBY_RADIUS_KM = 200;
export const NEARBY_MAX_RESULTS = 50;

/** Columns the cards, the map and the marker sheet actually read.
 *  Exported so the server component can seed the page with the same shape. */
export const VENDOR_COLUMNS =
  "id, slug, business_name, business_name_ar, city, city_ar, governorate, " +
  "district, address, latitude, longitude, maps_link, rating, total_reviews, " +
  "cover_image_url, phone, supported_makes, specializations";

export interface NearbyCenter {
  id: string;
  slug: string | null;
  name: string;
  name_ar: string | null;
  city: string | null;
  city_ar: string | null;
  governorate: string | null;
  district: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  maps_link: string | null;
  rating: number;
  total_reviews: number;
  cover_image_url: string | null;
  phone: string | null;
  supported_makes: string[];
  specializations: string[];
  /** Kilometres from the visitor, or null when there is no fix or no coords. */
  distance_km: number | null;
}

export interface NearbyResult {
  centers: NearbyCenter[];
  /** True when distances came from the client-side fallback, not the RPC. */
  usedFallback: boolean;
  /** Set only when nothing could be loaded at all. */
  error: string | null;
}

/** Raw row shape from either the RPC or the table read. */
export type RawVendorRow = Record<string, unknown>;

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function nullableNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function toCenter(row: RawVendorRow): NearbyCenter {
  return {
    id: String(row.id),
    slug: str(row.slug),
    name: String(row.business_name ?? ""),
    name_ar: str(row.business_name_ar),
    city: str(row.city),
    city_ar: str(row.city_ar),
    governorate: str(row.governorate),
    district: str(row.district),
    address: str(row.address),
    latitude: nullableNum(row.latitude),
    longitude: nullableNum(row.longitude),
    maps_link: str(row.maps_link),
    rating: num(row.rating),
    total_reviews: num(row.total_reviews),
    cover_image_url: str(row.cover_image_url),
    phone: str(row.phone),
    supported_makes: strArray(row.supported_makes),
    specializations: strArray(row.specializations),
    distance_km: nullableNum(row.distance_km),
  };
}

/**
 * Sort nearest → farthest, with centers that have no distance last rather than
 * dropped: a center without coordinates is still a real, bookable business.
 */
function byDistance(a: NearbyCenter, b: NearbyCenter): number {
  if (a.distance_km === null && b.distance_km === null) return 0;
  if (a.distance_km === null) return 1;
  if (b.distance_km === null) return -1;
  return a.distance_km - b.distance_km;
}

/**
 * Map raw vendor rows to the shape the UI renders. Exported so the Near Me
 * server component can seed the page from its own Supabase client without
 * duplicating this mapping.
 */
export function mapVendorRows(rows: RawVendorRow[]): NearbyCenter[] {
  return rows.map(toCenter);
}

/** Approved centers, no location involved. */
async function fetchDirectory(): Promise<NearbyCenter[]> {
  const supabase = createClient();
  // `as any`: the generated Database type in types/database.ts predates
  // maps_link/district on vendors. The columns exist — bookingActions.ts and
  // the services listing already read them in production.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("vendors")
    .select(VENDOR_COLUMNS)
    .eq("status", "approved");

  if (error) throw new Error(error.message);
  return ((data ?? []) as RawVendorRow[]).map(toCenter);
}

/** Attach client-side haversine distances to a directory read. */
function withLocalDistances(
  centers: NearbyCenter[],
  origin: Coordinates,
): NearbyCenter[] {
  return centers
    .map((c) => ({
      ...c,
      distance_km: hasUsableCoordinates(c.latitude, c.longitude)
        ? haversineKm(origin.lat, origin.lng, c.latitude!, c.longitude!)
        : null,
    }))
    .sort(byDistance);
}

/**
 * Load centers for the Near Me view.
 *
 * @param origin The visitor's position, or null when there is no fix — in which
 *               case the full approved directory comes back unsorted by
 *               distance, which is the correct no-location experience.
 */
export async function fetchNearbyCenters(
  origin: Coordinates | null,
): Promise<NearbyResult> {
  if (!origin) {
    try {
      return { centers: await fetchDirectory(), usedFallback: false, error: null };
    } catch (err) {
      return {
        centers: [],
        usedFallback: false,
        error: err instanceof Error ? err.message : "Failed to load centers",
      };
    }
  }

  // Preferred path — the same RPC the mobile app calls.
  try {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("nearby_vendors", {
      user_lat: origin.lat,
      user_lng: origin.lng,
      radius_km: NEARBY_RADIUS_KM,
      max_results: NEARBY_MAX_RESULTS,
    });

    if (error) throw new Error(error.message);
    if (Array.isArray(data)) {
      // Already filtered, limited and ordered by the RPC; sorting again is
      // cheap insurance and makes the ordering explicit at this layer.
      return {
        centers: (data as RawVendorRow[]).map(toCenter).sort(byDistance),
        usedFallback: false,
        error: null,
      };
    }
    throw new Error("nearby_vendors returned an unexpected shape");
  } catch (rpcErr) {
    console.warn(
      "[nearbyService] nearby_vendors unavailable, computing distances locally:",
      rpcErr,
    );
  }

  // Fallback — a working list beats an error screen.
  try {
    const centers = await fetchDirectory();
    return {
      centers: withLocalDistances(centers, origin),
      usedFallback: true,
      error: null,
    };
  } catch (err) {
    return {
      centers: [],
      usedFallback: true,
      error: err instanceof Error ? err.message : "Failed to load centers",
    };
  }
}
