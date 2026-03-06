"use client";

/**
 * GarageContext â€” The backbone of the product logic.
 *
 * Manages the user's saved vehicles ("My Garage") and tracks which one is
 * currently active. The active vehicle drives compatibility filtering across
 * the entire app: parts search, service booking, recommendations, etc.
 *
 * Persistence:
 *  - Authenticated users â†’ Supabase `vehicles` table (primary) + localStorage
 *  - Guests â†’ localStorage only
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Vehicle } from "@/types";
import { createClient } from "@/lib/supabase/client";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Human-readable label for a vehicle, e.g. "2019 BMW 3 Series 320i" */
export function vehicleLabel(v: Vehicle): string {
  const parts = [String(v.year), v.brand, v.model];
  if (v.trim) parts.push(v.trim);
  return parts.join(" ");
}

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Input shape when adding a new vehicle (id is auto-generated) */
export type NewVehicleInput = Omit<Vehicle, "id">;

export interface GarageContextValue {
  /** All vehicles saved to the garage */
  vehicles: Vehicle[];
  /** The currently selected vehicle (drives compatibility filtering) */
  activeVehicle: Vehicle | null;
  /** Whether the context has finished hydrating from localStorage / Supabase */
  isHydrated: boolean;

  /** Save a new vehicle. Returns the generated id. */
  addVehicle: (input: NewVehicleInput) => string;
  /** Remove a vehicle by id. If it was active, clears the active selection. */
  removeVehicle: (id: string) => void;
  /** Set a vehicle as the active one by id. */
  setActiveVehicle: (id: string) => void;
  /** Clear the active vehicle selection without removing it. */
  clearActiveVehicle: () => void;
  /** Replace an existing vehicle's data. */
  updateVehicle: (id: string, updates: Partial<NewVehicleInput>) => void;
}

// â”€â”€ Context â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const GarageContext = createContext<GarageContextValue | null>(null);

// â”€â”€ Storage keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STORAGE_VEHICLES = "garage_vehicles";
const STORAGE_ACTIVE_ID = "garage_active_id";

function readVehicles(): Vehicle[] {
  try {
    const raw = localStorage.getItem(STORAGE_VEHICLES);
    return raw ? (JSON.parse(raw) as Vehicle[]) : [];
  } catch {
    return [];
  }
}

function readActiveId(): string | null {
  try {
    return localStorage.getItem(STORAGE_ACTIVE_ID);
  } catch {
    return null;
  }
}

// â”€â”€ DB helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Map a Supabase vehicles row to our local Vehicle type */
function dbRowToVehicle(row: {
  id: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  engine_code: string | null;
  color: string | null;
  plate_number: string | null;
  mileage: number | null;
  is_default: boolean;
}): Vehicle {
  return {
    id: row.id,
    brand: row.make,
    model: row.model,
    year: row.year,
    trim: row.trim ?? undefined,
    engine: row.engine_code ?? undefined,
    color: row.color ?? undefined,
    plate: row.plate_number ?? undefined,
    mileage: row.mileage ?? undefined,
  };
}

// â”€â”€ Provider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function GarageProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // â”€â”€ Initial hydration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      // 1. Check current auth session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session?.user) {
        // Authenticated: load from Supabase
        setUserId(session.user.id);
        const { data: rows } = await supabase
          .from("vehicles")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at");

        if (!cancelled && rows) {
          const dbVehicles = rows.map(dbRowToVehicle);
          setVehicles(dbVehicles);
          // Restore active id from localStorage (persists across refreshes)
          const savedActiveId = readActiveId();
          const validId = dbVehicles.find((v) => v.id === savedActiveId)?.id;
          setActiveId(
            validId ??
              dbVehicles.find((v) =>
                rows.find((r) => r.id === v.id && r.is_default),
              )?.id ??
              null,
          );
        }
      } else {
        // Guest: load from localStorage
        setVehicles(readVehicles());
        setActiveId(readActiveId());
      }

      if (!cancelled) setIsHydrated(true);
    }

    hydrate();

    // Listen for auth state changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUserId(session.user.id);
        const { data: rows } = await supabase
          .from("vehicles")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at");
        if (rows) {
          setVehicles(rows.map(dbRowToVehicle));
        }
      } else if (event === "SIGNED_OUT") {
        setUserId(null);
        // Fall back to localStorage on sign-out
        setVehicles(readVehicles());
        setActiveId(readActiveId());
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // â”€â”€ Persist to localStorage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_VEHICLES, JSON.stringify(vehicles));
    } catch {
      // localStorage unavailable (private browsing / storage full)
    }
  }, [vehicles]);

  const activeHydratedRef = useRef(false);
  useEffect(() => {
    if (!activeHydratedRef.current) {
      activeHydratedRef.current = true;
      return;
    }
    try {
      if (activeId) {
        localStorage.setItem(STORAGE_ACTIVE_ID, activeId);
      } else {
        localStorage.removeItem(STORAGE_ACTIVE_ID);
      }
    } catch {
      // ignore
    }
  }, [activeId]);

  // â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const addVehicle = useCallback(
    (input: NewVehicleInput): string => {
      const id = generateId();
      const vehicle: Vehicle = { ...input, id };
      setVehicles((prev) => [...prev, vehicle]);
      setActiveId((prev) => prev ?? id);

      // Sync to Supabase if authenticated
      if (userId) {
        supabase
          .from("vehicles")
          .insert({
            id,
            user_id: userId,
            make: input.brand,
            model: input.model,
            year: input.year,
            trim: input.trim ?? null,
            engine_code: input.engine ?? null,
            color: input.color ?? null,
            plate_number: input.plate ?? null,
            mileage: input.mileage ?? null,
            is_default: false,
          })
          .then(({ error }) => {
            if (error) console.error("Failed to save vehicle to DB:", error);
          });
      }

      return id;
    },
    [supabase, userId],
  );

  const removeVehicle = useCallback(
    (id: string) => {
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      setActiveId((prev) => (prev !== id ? prev : null));

      // Delete from Supabase if authenticated
      if (userId) {
        supabase
          .from("vehicles")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error)
              console.error("Failed to delete vehicle from DB:", error);
          });
      }
    },
    [supabase, userId],
  );

  const setActiveVehicle = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const clearActiveVehicle = useCallback(() => {
    setActiveId(null);
  }, []);

  const updateVehicle = useCallback(
    (id: string, updates: Partial<NewVehicleInput>) => {
      setVehicles((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...updates } : v)),
      );

      // Sync update to Supabase
      if (userId) {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.brand !== undefined) dbUpdates.make = updates.brand;
        if (updates.model !== undefined) dbUpdates.model = updates.model;
        if (updates.year !== undefined) dbUpdates.year = updates.year;
        if (updates.trim !== undefined) dbUpdates.trim = updates.trim;
        if (updates.engine !== undefined)
          dbUpdates.engine_code = updates.engine;
        if (updates.color !== undefined) dbUpdates.color = updates.color;
        if (updates.plate !== undefined) dbUpdates.plate_number = updates.plate;
        if (updates.mileage !== undefined) dbUpdates.mileage = updates.mileage;

        if (Object.keys(dbUpdates).length > 0) {
          supabase
            .from("vehicles")
            .update(dbUpdates)
            .eq("id", id)
            .then(({ error }) => {
              if (error)
                console.error("Failed to update vehicle in DB:", error);
            });
        }
      }
    },
    [supabase, userId],
  );

  // â”€â”€ Derived values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const activeVehicle = useMemo(
    () => vehicles.find((v) => v.id === activeId) ?? null,
    [vehicles, activeId],
  );

  const value = useMemo<GarageContextValue>(
    () => ({
      vehicles,
      activeVehicle,
      isHydrated,
      addVehicle,
      removeVehicle,
      setActiveVehicle,
      clearActiveVehicle,
      updateVehicle,
    }),
    [
      vehicles,
      activeVehicle,
      isHydrated,
      addVehicle,
      removeVehicle,
      setActiveVehicle,
      clearActiveVehicle,
      updateVehicle,
    ],
  );

  return (
    <GarageContext.Provider value={value}>{children}</GarageContext.Provider>
  );
}

// â”€â”€ Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useGarage(): GarageContextValue {
  const ctx = useContext(GarageContext);
  if (!ctx) {
    throw new Error("useGarage must be used inside <GarageProvider>");
  }
  return ctx;
}
