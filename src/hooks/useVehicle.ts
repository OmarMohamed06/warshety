"use client";

/**
 * useVehicle — The compatibility engine hook.
 *
 * Built on top of GarageContext, this is the primary hook for any component
 * that needs to filter or annotate parts/services based on the user's active
 * vehicle. It is the "backbone" that the PRD describes.
 *
 * Key capabilities:
 *  - isCompatible(part)       — true if the active vehicle matches any of
 *                               the part's compatibleVehicles strings
 *  - filterCompatible(parts)  — returns only compatible parts (or all when
 *                               no vehicle is selected — graceful degradation)
 *  - compatibilityQuery       — plain object ready to be spread into API
 *                               query params: { brand, model, year, engineCode }
 *  - compatibilityString      — human label used in filter chips & headings
 *
 * Compatibility matching strategy (conservative, works without a full VIN DB):
 *   A part is considered compatible when its `compatibleVehicles` array
 *   contains at least one string that includes ALL of: brand, model, year.
 *   If the vehicle also has an engineCode, that is matched as an additional
 *   filter when the part string contains any engine info.
 *
 * Usage:
 *   const { activeVehicle, isCompatible, filterCompatible } = useVehicle();
 */

import { useMemo } from "react";
import {
  useGarage as useGarageContext,
  vehicleLabel,
} from "@/context/GarageContext";
import type { Vehicle } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Flat query object suitable for API / URL search params */
export interface VehicleCompatibilityQuery {
  brand?: string;
  model?: string;
  year?: number;
  trim?: string;
  engineCode?: string;
  chassis?: string;
}

export interface UseVehicleReturn {
  /** The currently active vehicle, or null */
  activeVehicle: Vehicle | null;
  /** True when a vehicle is selected */
  hasActiveVehicle: boolean;
  /** Human-readable label e.g. "2019 BMW 3 Series 320i" */
  activeVehicleLabel: string | null;

  /**
   * Returns a compatibility query object ready for API calls / URL params.
   * Returns an empty object when no vehicle is active.
   */
  compatibilityQuery: VehicleCompatibilityQuery;

  /**
   * Short compatibility string for display in filter chips, e.g.
   * "BMW 3 Series 2019" — brand + model + year only (no trim/engine).
   * Null when no vehicle is selected.
   */
  compatibilityString: string | null;

  /** All saved vehicles (passthrough from GarageContext) */
  vehicles: Vehicle[];

  /** Whether GarageContext has finished hydrating from localStorage */
  isHydrated: boolean;
}

// ── Compatibility matcher ─────────────────────────────────────────────────────

/**
 * Case-insensitive token check: does `haystack` include all tokens?
 */
function includesAll(haystack: string, tokens: string[]): boolean {
  const lower = haystack.toLowerCase();
  return tokens.every((t) => lower.includes(t.toLowerCase()));
}


// ── Hook ──────────────────────────────────────────────────────────────────────

export function useVehicle(): UseVehicleReturn {
  const { vehicles, activeVehicle, isHydrated } = useGarageContext();

  const hasActiveVehicle = activeVehicle !== null;

  const activeVehicleLabel = useMemo(
    () => (activeVehicle ? vehicleLabel(activeVehicle) : null),
    [activeVehicle],
  );

  const compatibilityString = useMemo(() => {
    if (!activeVehicle) return null;
    return `${activeVehicle.brand} ${activeVehicle.model} ${activeVehicle.year}`;
  }, [activeVehicle]);

  const compatibilityQuery = useMemo<VehicleCompatibilityQuery>(() => {
    if (!activeVehicle) return {};
    return {
      brand: activeVehicle.brand,
      model: activeVehicle.model,
      year: activeVehicle.year,
      ...(activeVehicle.trim ? { trim: activeVehicle.trim } : {}),
      ...(activeVehicle.engineCode
        ? { engineCode: activeVehicle.engineCode }
        : {}),
      ...(activeVehicle.chassis ? { chassis: activeVehicle.chassis } : {}),
    };
  }, [activeVehicle]);

  return {
    activeVehicle,
    hasActiveVehicle,
    activeVehicleLabel,
    compatibilityString,
    compatibilityQuery,
    vehicles,
    isHydrated,
  };
}
