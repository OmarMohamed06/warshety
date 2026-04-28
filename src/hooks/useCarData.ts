"use client";

/**
 * useCarData — Fetches car makes and models from Supabase.
 *
 * useCarMakes()           → { makes, loading }
 * useCarModels(makeId)    → { models, loading }
 *
 * Uses the `car_makes` and `car_models` tables which have 110 makes and
 * 2,400+ models.
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CarMake {
  id: string;
  name: string;
}

export interface CarModel {
  id: string;
  name: string;
}

/** Fetches all active car makes sorted by name. */
export function useCarMakes() {
  const [makes, setMakes] = useState<CarMake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    db.from("car_makes")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .then(({ data }: { data: CarMake[] | null }) => {
        setMakes(data ?? []);
        setLoading(false);
      });
  }, []);

  return { makes, loading };
}

/** Fetches active models for a given make UUID. Resets when makeId changes. */
export function useCarModels(makeId: string | null) {
  const [models, setModels] = useState<CarModel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!makeId) {
      setModels([]);
      return;
    }
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    db.from("car_models")
      .select("id, name")
      .eq("make_id", makeId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }: { data: CarModel[] | null }) => {
        setModels(data ?? []);
        setLoading(false);
      });
  }, [makeId]);

  return { models, loading };
}
