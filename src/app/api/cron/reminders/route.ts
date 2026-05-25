/**
 * /api/cron/reminders — Daily notification jobs
 *
 * Runs daily at 09:00 UTC (11:00 Cairo time) via Vercel Cron.
 *
 * Jobs performed:
 *  1. Customer 24h reminder — SMS to customers with bookings tomorrow.
 *  2. Vendor daily summary  — Email to each vendor with tomorrow's bookings.
 *
 * ── Authentication ─────────────────────────────────────────────────────────
 *   Requests must include:  Authorization: Bearer <CRON_SECRET>
 *   Same pattern as /api/cron/billing.
 *
 * ── Environment variables required ─────────────────────────────────────────
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CRON_SECRET
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  notifyCustomerBookingReminder,
  notifyVendorDailyBookingSummary,
  resolveBookingRecipient,
} from "@/services/outboundNotificationService";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function tomorrowDateString(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

interface BookingRow {
  id: string;
  booking_date: string;
  booking_time: string | null;
  booking_type: string;
  service_key: string | null;
  user_id: string;
  vendor_id: string;
  branch_id: string | null;
  user: { phone?: string; email?: string; full_name?: string } | null;
  vendor: { business_name?: string } | null;
}

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = serviceClient();
  const tomorrow = tomorrowDateString();

  // ── Fetch all tomorrow's confirmed / booked bookings ────────────────────
  const { data: bookings, error } = await db
    .from("bookings")
    .select(
      `id, booking_date, booking_time, booking_type, service_key, user_id, vendor_id, branch_id,
       user:users!inner(phone, email, full_name),
       vendor:vendors!inner(business_name)`,
    )
    .eq("booking_date", tomorrow)
    .in("status", ["booked", "confirmed"]);

  if (error) {
    console.error("[cron/reminders] DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (bookings ?? []) as BookingRow[];
  const results = { customerSms: 0, vendorEmails: 0, errors: [] as string[] };

  // ── 1. Customer SMS reminders ────────────────────────────────────────────
  for (const b of rows) {
    const phone = b.user?.phone;
    if (!phone) continue;
    const centerName = b.vendor?.business_name ?? "the service center";
    const time = b.booking_time ?? "your scheduled time";
    await notifyCustomerBookingReminder({
      userId: b.user_id,
      phone,
      centerName,
      time,
      bookingId: b.id,
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      results.errors.push(`customer-sms:${b.id}: ${msg}`);
    });
    results.customerSms++;
  }

  // ── 2. Vendor daily summary emails ───────────────────────────────────────
  // Group bookings by vendor (resolved recipient = branch manager or vendor owner)
  const vendorMap = new Map<
    string, // vendorEmail (dedup key)
    {
      vendorUserId?: string;
      vendorEmail: string;
      businessName: string;
      bookings: Array<{
        customerName: string;
        service: string;
        time: string;
        bookingId: string;
      }>;
    }
  >();

  for (const b of rows) {
    let recipient: {
      email: string | null;
      phone: string | null;
      userId: string | null;
    };
    try {
      recipient = await resolveBookingRecipient(b.branch_id, b.vendor_id);
    } catch {
      continue;
    }
    if (!recipient.email) continue;

    const service = b.service_key
      ? b.service_key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : b.booking_type
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

    const entry = vendorMap.get(recipient.email) ?? {
      vendorUserId: recipient.userId ?? undefined,
      vendorEmail: recipient.email,
      businessName: b.vendor?.business_name ?? "Service Center",
      bookings: [],
    };
    entry.bookings.push({
      customerName: b.user?.full_name ?? "Customer",
      service,
      time: b.booking_time ?? "TBD",
      bookingId: b.id,
    });
    vendorMap.set(recipient.email, entry);
  }

  for (const v of vendorMap.values()) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";
    await notifyVendorDailyBookingSummary({
      vendorUserId: v.vendorUserId,
      vendorEmail: v.vendorEmail,
      businessName: v.businessName,
      bookings: v.bookings,
      date: tomorrow,
      dashboardLink: `${appUrl}/en/vendor/bookings`,
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      results.errors.push(`vendor-summary:${v.vendorEmail}: ${msg}`);
    });
    results.vendorEmails++;
  }

  console.log("[cron/reminders]", results);
  return NextResponse.json({ ok: true, date: tomorrow, ...results });
}
