/**
 * geo.ts — Location processing utilities
 *
 * Priority for resolving vendor coordinates:
 *  1. Direct coordinates (lat, lng string)
 *  2. Google Maps link → extract coordinates from URL
 *  3. Address → Nominatim geocode (with Egypt context)
 *
 * All functions are usable from both client and server (no Node-only APIs).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationResolutionResult {
  coordinates: Coordinates | null;
  error: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_LAT = { min: -90, max: 90 };
const VALID_LNG = { min: -180, max: 180 };

// Rough Egypt bounding box — warn but don't reject outside this
const EGYPT_BOUNDS = {
  lat: { min: 22.0, max: 31.7 },
  lng: { min: 24.7, max: 36.9 },
};

// ── Coordinate validation ─────────────────────────────────────────────────────

export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    isFinite(lat) &&
    isFinite(lng) &&
    lat >= VALID_LAT.min &&
    lat <= VALID_LAT.max &&
    lng >= VALID_LNG.min &&
    lng <= VALID_LNG.max
  );
}

export function isInEgypt(lat: number, lng: number): boolean {
  return (
    lat >= EGYPT_BOUNDS.lat.min &&
    lat <= EGYPT_BOUNDS.lat.max &&
    lng >= EGYPT_BOUNDS.lng.min &&
    lng <= EGYPT_BOUNDS.lng.max
  );
}

/** Parse a "lat,lng" string like "30.0444, 31.2357" */
export function parseCoordString(raw: string): Coordinates | null {
  const cleaned = raw.trim().replace(/\s+/g, "");
  const match = cleaned.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (!isValidCoordinates(lat, lng)) return null;
  return { lat, lng };
}

// ── Google Maps link parser ───────────────────────────────────────────────────

/**
 * Attempt to extract lat/lng directly from a Google Maps URL.
 *
 * Handles common patterns:
 *  - https://maps.google.com/?q=30.0444,31.2357
 *  - https://www.google.com/maps/place/.../@30.0444,31.2357,15z/...
 *  - https://maps.app.goo.gl/...  (short link — cannot extract, returns null)
 *  - https://goo.gl/maps/...      (short link — cannot extract, returns null)
 */
export function extractCoordsFromMapsLink(url: string): Coordinates | null {
  if (!url?.trim()) return null;

  try {
    const u = new URL(url.trim());

    // Pattern 1: ?q=lat,lng
    const q = u.searchParams.get("q");
    if (q) {
      const coords = parseCoordString(q);
      if (coords) return coords;
    }

    // Pattern 2: /@lat,lng,zoom or /@lat,lng,altm (in pathname)
    const atMatch = u.pathname.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (isValidCoordinates(lat, lng)) return { lat, lng };
    }

    // Pattern 3: /place/.../ll=lat,lng or ?ll=lat,lng
    const ll = u.searchParams.get("ll");
    if (ll) {
      const coords = parseCoordString(ll);
      if (coords) return coords;
    }
  } catch {
    // Invalid URL — fall through
  }

  return null; // Short links or unparseable URLs
}

// ── Address normalisation ─────────────────────────────────────────────────────

const EGYPT_SUFFIXES = ["egypt", "مصر", "eg"];

/**
 * Normalize an address string for geocoding.
 * Appends ", Egypt" when no Egypt context is detected.
 */
export function normalizeAddress(
  address: string,
  governorate?: string,
  area?: string,
): string {
  let parts = [address.trim()];
  if (area && !address.toLowerCase().includes(area.toLowerCase()))
    parts.push(area);
  if (governorate && !address.toLowerCase().includes(governorate.toLowerCase()))
    parts.push(governorate);

  const joined = parts.join(", ");
  const lower = joined.toLowerCase();
  const hasEgypt = EGYPT_SUFFIXES.some((s) => lower.includes(s));
  return hasEgypt ? joined : `${joined}, Egypt`;
}

// ── Google Maps Geocoding API (server-side) ─────────────────────────────────

/**
 * Geocode an address using the Google Maps Geocoding API.
 *
 * ⚠️  Call this only from server-side code (server actions / route handlers).
 *    The API key is read from process.env.GOOGLE_MAPS_API_KEY which is
 *    intentionally NOT prefixed with NEXT_PUBLIC_.
 *
 * Falls back to OpenStreetMap Nominatim when no key is configured
 * (useful for local dev without a key).
 */
export async function geocodeAddress(
  address: string,
  governorate?: string,
  area?: string,
): Promise<Coordinates | null> {
  const query = normalizeAddress(address, governorate, area);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // ── Google Maps Geocoding API ─────────────────────────────────────────────
  if (apiKey) {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/geocode/json?` +
        new URLSearchParams({
          address: query,
          region: "eg", // bias toward Egypt
          components: "country:EG",
          key: apiKey,
        });

      const res = await fetch(url);
      if (!res.ok) return null;

      const data = await res.json();
      if (data.status !== "OK" || !data.results?.length) return null;

      const loc = data.results[0].geometry.location;
      const lat = Number(loc.lat);
      const lng = Number(loc.lng);
      if (!isValidCoordinates(lat, lng)) return null;

      return { lat, lng };
    } catch {
      return null;
    }
  }

  // ── Fallback: OpenStreetMap Nominatim (no key required) ───────────────────
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      new URLSearchParams({
        q: query,
        format: "json",
        limit: "1",
        countrycodes: "eg",
      });

    const res = await fetch(url, {
      headers: { "User-Agent": "Warshety/1.0 (warshety.com)" },
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (!isValidCoordinates(lat, lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

// ── Main resolution function ──────────────────────────────────────────────────

export interface LocationInput {
  coordString?: string; // "30.0444,31.2357"
  mapsLink?: string; // Google Maps URL
  address?: string; // Street address text
  governorate?: string;
  area?: string;
}

/**
 * Resolve vendor location input to coordinates using priority logic:
 *  1. Direct coordinate string
 *  2. Google Maps link → extract coordinates
 *  3. Address → geocode
 */
export async function resolveLocation(
  input: LocationInput,
): Promise<LocationResolutionResult> {
  const { coordString, mapsLink, address, governorate, area } = input;

  // ── Priority 1: direct coordinates ───────────────────────────────────────
  if (coordString?.trim()) {
    const coords = parseCoordString(coordString);
    if (!coords)
      return {
        coordinates: null,
        error:
          "Invalid coordinates format. Use: lat,lng (e.g. 30.0444,31.2357)",
      };
    if (!isValidCoordinates(coords.lat, coords.lng))
      return {
        coordinates: null,
        error: "Coordinates are outside valid geographic range.",
      };
    return { coordinates: coords, error: null };
  }

  // ── Priority 2: Google Maps link ──────────────────────────────────────────
  if (mapsLink?.trim()) {
    const fromLink = extractCoordsFromMapsLink(mapsLink);
    if (fromLink) return { coordinates: fromLink, error: null };
    // Short link or unresolvable — fall through to address if available
    if (!address?.trim())
      return {
        coordinates: null,
        error:
          "Could not extract coordinates from this Maps link. Please use a full Google Maps URL or enter a street address.",
      };
  }

  // ── Priority 3: address geocoding ─────────────────────────────────────────
  if (address?.trim()) {
    const coords = await geocodeAddress(address, governorate, area);
    if (!coords)
      return {
        coordinates: null,
        error:
          "Could not locate this address on the map. Please add more detail (building number, landmark, city) or paste a Google Maps link.",
      };
    return { coordinates: coords, error: null };
  }

  return {
    coordinates: null,
    error: "Please provide at least an address or Google Maps link.",
  };
}

// ── Haversine distance (client-side) ─────────────────────────────────────────

/** Great-circle distance in km between two coordinate pairs. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Format a distance nicely: "1.2 km" or "800 m" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// ── Browser geolocation helper ────────────────────────────────────────────────

export interface UserLocationResult {
  coordinates: Coordinates | null;
  error: string | null;
  denied: boolean;
}

/**
 * Request user's location via the browser Geolocation API.
 * Resolves immediately — never rejects.
 */
export function getUserLocation(timeoutMs = 8000): Promise<UserLocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({
        coordinates: null,
        error: "Geolocation not supported",
        denied: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
          denied: false,
        });
      },
      (err) => {
        resolve({
          coordinates: null,
          error: err.message,
          denied: err.code === err.PERMISSION_DENIED,
        });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
