/**
 * POST /api/vendor/bosta/register-pickup
 *
 * Registers the vendor's pickup address with Bosta and saves the
 * returned `businessLocationId` as `bosta_pickup_address_id` on the vendor record.
 *
 * Body:
 *   pickupAddress:     string   (street address)
 *   pickupCity:        string   (Bosta city name, e.g. "Cairo")
 *   pickupGovernorate: string
 *   pickupDistrict?:   string
 *   pickupPhone?:      string   (defaults to vendor.phone)
 *
 * The caller can re-run this to update the address — a new Bosta location
 * will be created each time and the new ID replaces the old one.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import { registerPickupAddress } from "@/services/bostaService";

function adminSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const cookieSupabase = await createCookieClient();
  const {
    data: { user },
  } = await cookieSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: {
    pickupAddress: string;
    pickupCity: string;
    pickupGovernorate: string;
    pickupDistrict?: string;
    pickupPhone?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    pickupAddress,
    pickupCity,
    pickupGovernorate,
    pickupDistrict,
    pickupPhone,
  } = body;

  if (!pickupAddress?.trim() || !pickupCity?.trim()) {
    return NextResponse.json(
      { error: "pickupAddress and pickupCity are required" },
      { status: 400 },
    );
  }

  const supabase = adminSupabase();

  // 3. Fetch vendor
  const { data: vendor, error: vendorErr } = await supabase
    .from("vendors")
    .select("id, business_name, phone, vendor_type, status")
    .eq("user_id", user.id)
    .eq("vendor_type", "parts_seller")
    .eq("status", "approved")
    .single();

  if (vendorErr || !vendor) {
    return NextResponse.json(
      { error: "Vendor profile not found or not approved" },
      { status: 403 },
    );
  }

  const contactPhone = pickupPhone?.trim() || vendor.phone;
  if (!contactPhone) {
    return NextResponse.json(
      {
        error:
          "A pickup phone number is required. Add one here or set your business phone in Settings.",
      },
      { status: 400 },
    );
  }

  // 4. Register with Bosta
  const result = await registerPickupAddress({
    name: vendor.business_name,
    address: {
      firstLine: pickupAddress.trim(),
      city: pickupCity.trim(),
      ...(pickupDistrict ? { districtName: pickupDistrict.trim() } : {}),
    },
    contactName: vendor.business_name,
    contactPhone,
  });

  if (result.error) {
    return NextResponse.json(
      { error: `Bosta registration failed: ${result.error}` },
      { status: 502 },
    );
  }

  // 5. Persist pickup info + Bosta location ID on the vendor row
  const { error: updateErr } = await supabase
    .from("vendors")
    .update({
      pickup_address: pickupAddress.trim(),
      pickup_city: pickupCity.trim(),
      pickup_governorate: pickupGovernorate?.trim() || null,
      pickup_district: pickupDistrict?.trim() || null,
      pickup_phone: contactPhone,
      bosta_pickup_address_id: result.locationId,
    })
    .eq("id", vendor.id);

  if (updateErr) {
    // Bosta location was created — still return its ID so the UI can show it.
    console.error("[register-pickup] DB update failed:", updateErr.message);
    return NextResponse.json({
      ok: true,
      bostaLocationId: result.locationId,
      warning:
        "Pickup registered with Bosta but could not save to DB: " +
        updateErr.message,
    });
  }

  return NextResponse.json({
    ok: true,
    bostaLocationId: result.locationId,
  });
}
