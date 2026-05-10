"use server";

/**
 * adminActions — Server-side admin operations.
 *
 * Uses the Supabase service-role key (SUPABASE_SERVICE_ROLE_KEY) which must
 * be set in your .env.local. Never expose this key to the browser.
 *
 * Vendor application flow (new):
 *  1. Vendor fills out the application form and chooses a vendor account email + password.
 *  2. createVendorApplicationWithAccount() creates an auth.users row (email_confirm=false)
 *     and the vendor_applications row in one server action — vendor cannot log in yet.
 *  3. Admin reviews the application in the admin dashboard.
 *  4. approveVendorApplication() confirms the email, creates the vendors row,
 *     updates the user role to "vendor" — no invite email needed.
 *  5. Vendor logs in immediately with the credentials they chose at apply time.
 *
 * Legacy /auth/vendor-setup page is kept for any previously-invited vendors.
 */

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminSupabaseClient } from "@supabase/supabase-js";
import { generateSlugEn, generateSlugAr } from "@/utils/seo";
import enMessages from "@/../messages/en.json";
import arMessages from "@/../messages/ar.json";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Supabase client with service-role key — bypasses RLS, server-only. */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.",
    );
  }
  // Guard: publishable/anon keys (sb_publishable_*) do NOT have admin rights.
  // The service role key must be a JWT (starts with "eyJ") or sb_secret_*.
  if (
    key.startsWith("sb_publishable_") ||
    (!key.startsWith("eyJ") && !key.startsWith("sb_secret_"))
  ) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY appears to be a publishable/anon key, not a service role key. " +
        "Go to Supabase Dashboard → Project Settings → API and copy the 'service_role' key.",
    );
  }
  return createAdminSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Verify the calling user is an admin. Returns null on success, error string on failure. */
async function assertAdmin(): Promise<string | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return "Unauthorized";
  return null;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Create a vendor auth account + application row in a single server action.
 *
 * Called from /vendor/apply/form — creates an auth.users entry with
 * email_confirm=false (vendor cannot log in until admin approves), then
 * inserts the vendor_applications row linked to that new user.
 *
 * Returns the new application ID on success.
 */
export async function createVendorApplicationWithAccount(params: {
  email: string;
  password: string;
  business_name: string;
  owner_name: string;
  vendor_type: string;
  phone: string;
  city: string;
  governorate: string;
}): Promise<{ applicationId: string | null; error: string | null }> {
  const admin = adminClient();

  // Create auth user — email not confirmed, so they cannot sign in yet
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: false,
    user_metadata: {
      full_name: params.owner_name,
      role: "vendor",
      pending_vendor: true,
    },
  });

  if (authErr) {
    const msg = authErr.message.toLowerCase();
    if (
      msg.includes("already registered") ||
      msg.includes("already been registered") ||
      msg.includes("user already exists")
    ) {
      return {
        applicationId: null,
        error:
          "This email is already registered. Please choose a different email for your vendor account.",
      };
    }
    return { applicationId: null, error: authErr.message };
  }

  const userId = authData.user.id;

  // Insert the vendor application linked to the new auth user
  const { data: appData, error: appErr } = await admin
    .from("vendor_applications")
    .insert({
      user_id: userId,
      business_name: params.business_name,
      vendor_type: params.vendor_type,
      owner_name: params.owner_name,
      email: params.email,
      phone: params.phone,
      city: params.city,
      governorate: params.governorate,
      step_completed: 1,
      status: "pending",
    })
    .select("id")
    .single();

  if (appErr || !appData) {
    // Rollback the auth user we just created
    await admin.auth.admin.deleteUser(userId);
    return {
      applicationId: null,
      error: appErr?.message ?? "Failed to save application.",
    };
  }

  return { applicationId: appData.id, error: null };
}

/**
 * Submit a complete vendor application atomically.
 * Called from the final "Account" step after all other info is collected in localStorage.
 * Creates the auth user + inserts the full vendor_applications row at once.
 */
export async function submitVendorApplication(params: {
  email: string;
  password: string;
  business_name: string;
  owner_name: string;
  vendor_type: string;
  phone: string;
  governorate?: string;
  city?: string;
  national_id_url?: string;
  national_id_front_url?: string;
  national_id_back_url?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  iban?: string;
  working_days?: string[];
  open_time?: string;
  close_time?: string;
  specializations?: string[];
  supported_makes?: string[];
  delivery_options?: string[];
  return_policy?: string;
  address?: string;
  maps_link?: string;
  shop_photos?: string[];
}): Promise<{ applicationId: string | null; error: string | null }> {
  const admin = adminClient();

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      full_name: params.owner_name,
      role: "vendor",
      pending_vendor: true,
    },
  });

  if (authErr) {
    const msg = authErr.message.toLowerCase();
    if (
      msg.includes("already registered") ||
      msg.includes("already been registered") ||
      msg.includes("user already exists")
    ) {
      return {
        applicationId: null,
        error:
          "This email is already registered. Please use a different email for your vendor account.",
      };
    }
    return { applicationId: null, error: authErr.message };
  }

  const userId = authData.user.id;

  const { data: appData, error: appErr } = await admin
    .from("vendor_applications")
    .insert({
      user_id: userId,
      business_name: params.business_name,
      vendor_type: params.vendor_type,
      owner_name: params.owner_name,
      email: params.email,
      phone: params.phone,
      governorate: params.governorate ?? null,
      city: params.city ?? null,
      national_id_url: params.national_id_url ?? null,
      national_id_front_url: params.national_id_front_url ?? null,
      national_id_back_url: params.national_id_back_url ?? null,
      bank_name: params.bank_name ?? null,
      account_name: params.account_name ?? null,
      account_number: params.account_number ?? null,
      iban: params.iban ?? null,
      working_days: params.working_days ?? null,
      open_time: params.open_time ?? null,
      close_time: params.close_time ?? null,
      specializations: params.specializations ?? null,
      supported_makes: params.supported_makes ?? [],
      delivery_options: params.delivery_options ?? null,
      return_policy: params.return_policy ?? null,
      address: params.address ?? null,
      maps_link: params.maps_link ?? null,
      shop_photos: params.shop_photos ?? null,
      terms_accepted: true,
      submitted_at: new Date().toISOString(),
      step_completed: 5,
      status: "pending",
    })
    .select("id")
    .single();

  if (appErr || !appData) {
    await admin.auth.admin.deleteUser(userId);
    return {
      applicationId: null,
      error: appErr?.message ?? "Failed to save application.",
    };
  }

  return { applicationId: appData.id, error: null };
}

/**
 * Approve a vendor application:
 *  1. Confirms the vendor's email so they can log in (they chose email+password at apply time)
 *  2. Creates the vendors row directly
 *  3. Sets the user's role to "vendor" in public.users
 *  4. Marks the application as approved
 *
 * No invite email is sent — the vendor can immediately log in with the
 * credentials they chose when they submitted the application.
 */
export async function approveVendorApplication(
  applicationId: string,
): Promise<{ error: string | null }> {
  const authErr = await assertAdmin();
  if (authErr) return { error: authErr };

  const supabase = await createServerClient();
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  const admin = adminClient();

  // Fetch the application
  const { data: app, error: appErr } = await admin
    .from("vendor_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (appErr || !app) return { error: "Application not found." };
  if (app.status !== "pending")
    return { error: "This application has already been processed." };

  // ── 1. Confirm the vendor's email so they can sign in ─────────────────────
  if (app.user_id) {
    const { error: confirmErr } = await admin.auth.admin.updateUserById(
      app.user_id,
      { email_confirm: true },
    );
    if (confirmErr) {
      return { error: `Could not activate account: ${confirmErr.message}` };
    }
  }

  // ── 2. Create the vendors row immediately ─────────────────────────────────
  if (app.user_id) {
    // Check if vendor row already exists (idempotency)
    const { data: existingVendor } = await admin
      .from("vendors")
      .select("id")
      .eq("user_id", app.user_id)
      .maybeSingle();

    if (!existingVendor) {
      // Generate a URL slug from the business name
      const baseSlug =
        generateSlugEn(app.business_name) ||
        generateSlugAr(app.business_name) ||
        app.id;
      // Ensure uniqueness by checking DB and appending counter if needed
      let finalSlug = baseSlug;
      let counter = 1;
      while (true) {
        const { data: existing } = await admin
          .from("vendors")
          .select("id")
          .eq("slug", finalSlug)
          .maybeSingle();
        if (!existing) break;
        counter++;
        finalSlug = `${baseSlug}-${counter}`;
      }

      const { data: newVendor, error: vendorErr } = await admin
        .from("vendors")
        .insert({
          user_id: app.user_id,
          business_name: app.business_name,
          vendor_type: app.vendor_type,
          status: "approved",
          approved_at: new Date().toISOString(),
          slug: finalSlug,
          phone: app.phone ?? null,
          email: app.email,
          address: app.address ?? null,
          city: app.city ?? null,
          governorate: app.governorate ?? null,
          maps_link: app.maps_link ?? null,
          cover_image_url: app.shop_photos?.[0] ?? null,
          specializations: app.specializations ?? [],
          supported_makes: app.supported_makes ?? [],
          commercial_reg_no: app.commercial_reg_no ?? null,
          tax_id: app.tax_id ?? null,
          description: app.description ?? null,
        })
        .select("id")
        .single();

      if (vendorErr || !newVendor) {
        return {
          error: `Could not create vendor record: ${vendorErr?.message}`,
        };
      }

      // ── Auto-create working hours from application data ──────────────────
      const DAY_MAP: Record<string, number> = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      };
      if (app.working_days?.length && app.open_time && app.close_time) {
        const hoursRows = (app.working_days as string[])
          .filter((d) => DAY_MAP[d] !== undefined)
          .map((d) => ({
            vendor_id: newVendor.id,
            day_of_week: DAY_MAP[d],
            open_time: app.open_time,
            close_time: app.close_time,
            is_open: true,
          }));
        if (hoursRows.length) {
          await admin.from("vendor_working_hours").insert(hoursRows);
        }
      }

      // ── Auto-create main branch from application data ────────────────────
      // Only for service centers — parts vendors don't use branches
      if (app.vendor_type === "service_center") {
        await admin.from("vendor_branches").insert({
          vendor_id: newVendor.id,
          name: app.business_name,
          address: app.address ?? null,
          city: app.city ?? null,
          governorate: app.governorate ?? null,
          maps_link: app.maps_link ?? null,
          phone: app.phone ?? null,
          status: "active",
          is_main: true,
        });
      }

      // ── Auto-seed services table from specializations ────────────────────
      if (app.specializations?.length) {
        const enServices =
          (
            enMessages as unknown as Record<
              string,
              Record<string, Record<string, string>>
            >
          )?.home?.services ?? {};
        const arServices =
          (
            arMessages as unknown as Record<
              string,
              Record<string, Record<string, string>>
            >
          )?.home?.services ?? {};
        const serviceRows = (app.specializations as string[]).map((slug) => ({
          vendor_id: newVendor.id,
          branch_id: null,
          name: enServices[slug] ?? slug,
          name_ar: arServices[slug] ?? null,
          active: true,
        }));
        await admin.from("services").insert(serviceRows);
      }
    }

    // ── 3. Update user role to "vendor" ──────────────────────────────────────
    await admin.from("users").update({ role: "vendor" }).eq("id", app.user_id);
  }

  // ── 4. Mark application as approved ─────────────────────────────────────
  await admin
    .from("vendor_applications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser?.id ?? null,
    })
    .eq("id", applicationId);

  return { error: null };
}

/**
 * Reject a vendor application.
 *
 * If the applicant's auth account was created at apply time and has not yet
 * been email-confirmed (i.e. never approved), the auth user is deleted so
 * the email is free for future use.
 */
export async function rejectVendorApplication(
  applicationId: string,
): Promise<{ error: string | null }> {
  const authErr = await assertAdmin();
  if (authErr) return { error: authErr };

  const supabase = await createServerClient();
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  const admin = adminClient();

  // Fetch to get user_id and current status
  const { data: app } = await admin
    .from("vendor_applications")
    .select("user_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  // Delete the pending (never-confirmed) auth user so the email can be reused
  if (app?.user_id && app.status === "pending") {
    const { data: authUserData } = await admin.auth.admin.getUserById(
      app.user_id,
    );
    if (authUserData?.user && !authUserData.user.email_confirmed_at) {
      await admin.auth.admin.deleteUser(app.user_id);
    }
  }

  await admin
    .from("vendor_applications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser?.id ?? null,
    })
    .eq("id", applicationId);

  return { error: null };
}

/**
 * Complete vendor onboarding — called from /auth/vendor-setup.
 *
 * After the invited vendor sets their password:
 *  1. Creates the vendors row using data from vendor_applications
 *  2. Ensures public.users.role = "vendor" (handles pre-existing customer accounts)
 *
 * Safe to call multiple times — returns early if vendor already exists.
 */
export async function completeVendorSetup(): Promise<{
  error: string | null;
  vendorType?: string;
  businessName?: string;
}> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = adminClient();

  // ── Check if vendor record already exists ────────────────────────────────
  const { data: existing } = await admin
    .from("vendors")
    .select("id, vendor_type, business_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return {
      error: null,
      vendorType: existing.vendor_type,
      businessName: existing.business_name,
    };
  }

  // ── Find the approved application ────────────────────────────────────────
  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  let applicationId: string | undefined = meta.application_id;

  // Fallback: search by email (for existing users whose metadata may differ)
  if (!applicationId) {
    const { data: found } = await admin
      .from("vendor_applications")
      .select("id, vendor_type, business_name")
      .eq("email", user.email!)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    applicationId = found?.id;
  }

  if (!applicationId) {
    return {
      error:
        "Could not locate your vendor application. Please contact support.",
    };
  }

  const { data: app, error: appErr } = await admin
    .from("vendor_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (appErr || !app) {
    return {
      error: "Could not load application data. Please contact support.",
    };
  }

  // ── Create vendors row ────────────────────────────────────────────────────
  const { error: vendorErr } = await admin.from("vendors").insert({
    user_id: user.id,
    business_name: app.business_name,
    vendor_type: app.vendor_type,
    status: "approved",
    phone: app.phone ?? null,
    email: app.email,
    address: app.address ?? null,
    city: app.city ?? null,
    commercial_reg_no: app.commercial_reg_no ?? null,
    tax_id: app.tax_id ?? null,
    description: app.description ?? null,
  });

  if (vendorErr) {
    return {
      error: `Could not create vendor account: ${vendorErr.message}`,
    };
  }

  // ── Ensure public.users.role = "vendor" (handles pre-existing customers) ──
  await admin
    .from("users")
    .update({ role: "vendor" })
    .eq("id", user.id)
    .neq("role", "vendor");

  return {
    error: null,
    vendorType: app.vendor_type,
    businessName: app.business_name,
  };
}
