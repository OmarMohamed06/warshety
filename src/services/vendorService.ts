/**
 * vendorService — Vendor management of services.
 *
 * Service Center logic:
 *  ✓ Add / edit / remove service
 *  ✓ Set price and duration
 *  ✓ Services linked to bookings
 */

import { createClient } from "@/lib/supabase/client";
import type { DbService } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateServiceInput {
  vendorId: string;
  name: string;
  description?: string;
  durationMinutes?: number;
}

export interface UpdateServiceInput {
  name?: string;
  description?: string;
  durationMinutes?: number;
  active?: boolean;
}

// ── Service (Workshop Service) CRUD ──────────────────────────────────────────

export async function createService(
  input: CreateServiceInput,
): Promise<{ service: DbService | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      vendor_id: input.vendorId,
      name: input.name,
      description: input.description ?? null,
      duration_minutes: input.durationMinutes ?? null,
      active: true,
    })
    .select("*")
    .single();
  return {
    service: error ? null : (data as DbService),
    error: error?.message ?? null,
  };
}

export async function updateService(
  serviceId: string,
  vendorId: string,
  updates: UpdateServiceInput,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("services")
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && {
        description: updates.description,
      }),
      ...(updates.durationMinutes !== undefined && {
        duration_minutes: updates.durationMinutes,
      }),
      ...(updates.active !== undefined && { active: updates.active }),
    })
    .eq("id", serviceId)
    .eq("vendor_id", vendorId);
  return { error: error?.message ?? null };
}

export async function deleteService(
  serviceId: string,
  vendorId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  // Soft-delete: set active=false (preserves booking history)
  const { error } = await supabase
    .from("services")
    .update({ active: false })
    .eq("id", serviceId)
    .eq("vendor_id", vendorId);
  return { error: error?.message ?? null };
}

export async function getVendorServices(
  vendorId: string,
  includeInactive = false,
): Promise<DbService[]> {
  const supabase = createClient();
  let query = supabase
    .from("services")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (!includeInactive) query = query.eq("active", true);
  const { data } = await query;
  return (data ?? []) as DbService[];
}
