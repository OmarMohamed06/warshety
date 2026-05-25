/**
 * POST /api/jobs/payment-reminders
 *
 * Scans vendor billing for:
 *   - pending invoices past their due date → notifyVendorPaymentOverdue
 *   - pending invoices due soon (within 3 days) → notifyVendorPaymentDue
 *
 * Both functions are rate-limited to 1 SMS + 1 Email per vendor per 24h
 * via notification_log, so this job can safely run daily without spamming.
 *
 * Secure with CRON_SECRET:
 *   curl -X POST /api/jobs/payment-reminders \
 *        -H "Authorization: Bearer <CRON_SECRET>"
 *
 * Add to vercel.json (or your cron service):
 *   { "path": "/api/jobs/payment-reminders", "schedule": "0 9 * * *" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  notifyVendorPaymentDue,
  notifyVendorPaymentOverdue,
} from "@/services/outboundNotificationService";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const soonStr = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // ── Service center billing ─────────────────────────────────────────────────
    const { data: scBilling } = await supabase
      .from("service_center_billing")
      .select(
        `id, vendor_id, total_fees_due, period_end,
         vendors(user_id, business_name, users(phone, email))`,
      )
      .eq("payment_status", "pending");

    let overdueCount = 0;
    let dueCount = 0;

    for (const row of scBilling ?? []) {
      const vendor = row.vendors as {
        user_id?: string;
        business_name?: string;
        users?: { phone?: string; email?: string };
      } | null;

      const phone = vendor?.users?.phone;
      const email = vendor?.users?.email;
      if (!phone || !email) continue;

      const vendorUserId = vendor?.user_id;
      const amountEGP = Number(row.total_fees_due) || 0;
      const dueDate = row.period_end as string;
      const billingLink = `${APP_URL}/vendor/billing`;

      if (dueDate < todayStr) {
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
        );
        await notifyVendorPaymentOverdue({
          vendorUserId,
          vendorPhone: phone,
          vendorEmail: email,
          amountEGP,
          daysOverdue,
          billingLink,
        });
        overdueCount++;
      } else if (dueDate <= soonStr) {
        await notifyVendorPaymentDue({
          vendorUserId,
          vendorPhone: phone,
          vendorEmail: email,
          amountEGP,
          dueDate,
          billingLink,
        });
        dueCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      overdueNotified: overdueCount,
      dueNotified: dueCount,
    });
  } catch (err) {
    console.error("[payment-reminders job]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
