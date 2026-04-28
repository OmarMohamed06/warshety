"use server";

/**
 * Server actions for geolocation / geocoding.
 *
 * These run exclusively on the server so GOOGLE_MAPS_API_KEY is never
 * exposed to the browser bundle.
 */

import {
  resolveLocation,
  isInEgypt,
  type LocationInput,
  type LocationResolutionResult,
} from "@/lib/geo";

// ── resolveVendorLocation ─────────────────────────────────────────────────────

/**
 * Resolves a vendor's location input to GPS coordinates.
 *
 * Priority order (mirrors resolveLocation in geo.ts):
 *   1. Raw "lat,lng" coordinate string
 *   2. Google / Apple Maps URL — coordinates extracted from the URL
 *   3. Address text geocoded via Google Maps Geocoding API (or Nominatim fallback)
 *
 * Called from the vendor onboarding location page ("use client") so that
 * the Google Maps API key stays server-side.
 */
export async function resolveVendorLocation(
  input: LocationInput,
): Promise<LocationResolutionResult & { outsideEgypt?: boolean }> {
  const result = await resolveLocation(input);

  if (result.coordinates) {
    const outside = !isInEgypt(result.coordinates.lat, result.coordinates.lng);
    return { ...result, outsideEgypt: outside };
  }

  return result;
}
