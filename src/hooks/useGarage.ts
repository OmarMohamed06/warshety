"use client";

/**
 * useGarage — Convenience wrapper around GarageContext.
 *
 * Re-exports everything from GarageContext and adds a handful of
 * ergonomic derived values so call-sites don't repeat the same logic.
 *
 * Usage:
 *   const { activeVehicle, addVehicle, hasVehicles } = useGarage();
 */

import { useMemo } from "react";
import {
  useGarage as useGarageContext,
  vehicleLabel,
  type GarageContextValue,
  type NewVehicleInput,
} from "@/context/GarageContext";
import type { Vehicle } from "@/types";

export type { NewVehicleInput };

export interface UseGarageReturn extends GarageContextValue {
  /** True when at least one vehicle is saved */
  hasVehicles: boolean;
  /** Number of saved vehicles */
  vehicleCount: number;
  /** True when a vehicle is actively selected */
  hasActiveVehicle: boolean;
  /** Human-readable label for the active vehicle, or null */
  activeVehicleLabel: string | null;
  /** Check whether a vehicle id is the current active one */
  isActive: (id: string) => boolean;
  /** vehicleLabel utility exposed directly from the hook */
  vehicleLabel: (v: Vehicle) => string;
}

export function useGarage(): UseGarageReturn {
  const ctx = useGarageContext();

  const derived = useMemo(
    () => ({
      hasVehicles: ctx.vehicles.length > 0,
      vehicleCount: ctx.vehicles.length,
      hasActiveVehicle: ctx.activeVehicle !== null,
      activeVehicleLabel: ctx.activeVehicle
        ? vehicleLabel(ctx.activeVehicle)
        : null,
      isActive: (id: string) => ctx.activeVehicle?.id === id,
      vehicleLabel,
    }),
    [ctx.vehicles, ctx.activeVehicle],
  );

  return { ...ctx, ...derived };
}
