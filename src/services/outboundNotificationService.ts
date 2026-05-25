/**
 * outboundNotificationService — SMS + Email delivery for critical platform events.
 *
 * Channels:
 *   SMS   → critical alerts (all key events)
 *   Email → rich details (orders, payments)
 *
 * SMS is a stub — same interface, logs to console until a provider is wired.
 * Email is live via Resend.
 *
 * Rate-limiting + dedup is enforced via the `notification_log` Supabase table.
 */

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// ── Supabase service-role client (server-side only) ───────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Resend client ─────────────────────────────────────────────────────────────

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY env var missing");
  return new Resend(key);
}

const FROM = `${process.env.RESEND_FROM_NAME ?? "Warshety"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@warshety.com"}>`;

// ── Types ─────────────────────────────────────────────────────────────────────

export type OutboundEventType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_completed"
  | "booking_reminder"
  | "car_ready"
  | "new_booking_vendor"
  | "vendor_booking_cancelled"
  | "payment_due"
  | "payment_overdue"
  | "vendor_approved"
  | "vendor_rejected"
  | "application_received";

export type NotificationChannel = "sms" | "email";

// ── Validation ────────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  // Accepts +20XXXXXXXXXX or 01XXXXXXXXX (Egyptian) and international formats
  return /^\+?[1-9]\d{7,14}$/.test(phone.replace(/\s/g, ""));
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

/**
 * Returns true if a send is allowed.
 * windowHours defaults per channel: SMS = 24h, Email = 1h.
 */
async function canSend(
  userId: string | undefined,
  channel: NotificationChannel,
  eventType: OutboundEventType,
  recipient: string,
  windowHours: number,
  idempotencyKey?: string,
): Promise<boolean> {
  // windowHours=0 means no rate limiting
  if (windowHours === 0) return true;
  try {
    const supabase = getServiceClient();
    const since = new Date(
      Date.now() - windowHours * 60 * 60 * 1000,
    ).toISOString();
    // When an idempotencyKey is provided (e.g. bookingId/orderId), deduplicate
    // on that key instead of just the email address — so each booking always
    // sends but the same booking never double-sends.
    const dedupeRecipient = idempotencyKey
      ? `${recipient}::${idempotencyKey}`
      : recipient;

    const query = supabase
      .from("notification_log")
      .select("id", { count: "exact", head: true })
      .eq("channel", channel)
      .eq("event_type", eventType)
      .eq("recipient", dedupeRecipient)
      .eq("status", "sent")
      .gte("sent_at", since);

    if (userId) query.eq("user_id", userId);

    const { count } = await query;
    return (count ?? 0) === 0;
  } catch {
    // Fail open — don't block sends if rate-limit check fails
    return true;
  }
}

/**
 * Record a send attempt in notification_log.
 */
async function logSend(params: {
  userId?: string;
  channel: NotificationChannel;
  eventType: OutboundEventType;
  recipient: string;
  idempotencyKey?: string;
  providerId?: string;
  status: "sent" | "failed";
  errorMessage?: string;
}): Promise<void> {
  try {
    const supabase = getServiceClient();
    const dedupeRecipient = params.idempotencyKey
      ? `${params.recipient}::${params.idempotencyKey}`
      : params.recipient;
    await supabase.from("notification_log").insert({
      user_id: params.userId ?? null,
      channel: params.channel,
      event_type: params.eventType,
      recipient: dedupeRecipient,
      provider_id: params.providerId ?? null,
      status: params.status,
      error_message: params.errorMessage ?? null,
      sent_at: new Date().toISOString(),
    });
  } catch {
    // Non-fatal — log but don't crash the caller
    console.error("[notif] Failed to write notification_log");
  }
}

// ── Core senders ──────────────────────────────────────────────────────────────

/**
 * Send an SMS.
 * STUB: logs to console until a real provider (Twilio/Vonage/etc.) is wired.
 * Replace the body of this function to integrate any provider — the interface is stable.
 */
export async function sendSMS(
  phone: string,
  message: string,
  {
    userId,
    eventType,
    windowHours = 0,
    idempotencyKey,
  }: {
    userId?: string;
    eventType: OutboundEventType;
    windowHours?: number;
    idempotencyKey?: string;
  },
): Promise<void> {
  if (!isValidPhone(phone)) {
    console.warn(`[SMS] Invalid phone number: ${phone}`);
    return;
  }

  const allowed = await canSend(
    userId,
    "sms",
    eventType,
    phone,
    windowHours,
    idempotencyKey,
  );
  if (!allowed) {
    console.log(
      `[SMS] Rate-limited — skipping ${eventType} to ${phone} (window: ${windowHours}h)`,
    );
    return;
  }

  try {
    // ── TODO: replace this block with your SMS provider SDK call ────────────
    // Example (Twilio):
    //   const client = twilio(process.env.SMS_ACCOUNT_SID, process.env.SMS_AUTH_TOKEN);
    //   const msg = await client.messages.create({
    //     body: message,
    //     from: process.env.SMS_FROM_NUMBER,
    //     to: phone,
    //   });
    //   providerId = msg.sid;
    // ────────────────────────────────────────────────────────────────────────
    console.log(`[SMS STUB] To: ${phone} | Msg: ${message}`);

    await logSend({
      userId,
      channel: "sms",
      eventType,
      recipient: phone,
      idempotencyKey,
      providerId: "stub",
      status: "sent",
    });
  } catch (err) {
    console.error("[SMS] Send failed:", err);
    await logSend({
      userId,
      channel: "sms",
      eventType,
      recipient: phone,
      idempotencyKey,
      status: "failed",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Send a transactional email via Resend.
 */
export async function sendEmail(
  email: string,
  subject: string,
  htmlBody: string,
  {
    userId,
    eventType,
    windowHours = 0,
    idempotencyKey,
  }: {
    userId?: string;
    eventType: OutboundEventType;
    windowHours?: number;
    idempotencyKey?: string;
  },
): Promise<void> {
  if (!isValidEmail(email)) {
    console.warn(`[Email] Invalid address: ${email}`);
    return;
  }

  const allowed = await canSend(
    userId,
    "email",
    eventType,
    email,
    windowHours,
    idempotencyKey,
  );
  if (!allowed) {
    console.log(
      `[Email] Rate-limited — skipping ${eventType} to ${email} (window: ${windowHours}h)`,
    );
    return;
  }

  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html: htmlBody,
    });

    if (error) throw new Error(error.message);

    await logSend({
      userId,
      channel: "email",
      eventType,
      recipient: email,
      idempotencyKey,
      providerId: data?.id,
      status: "sent",
    });
  } catch (err) {
    console.error("[Email] Send failed:", err);
    await logSend({
      userId,
      channel: "email",
      eventType,
      recipient: email,
      idempotencyKey,
      status: "failed",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── Recipient resolution ──────────────────────────────────────────────────────

/**
 * Resolves the notification recipient for booking events.
 *
 * Priority:
 *  1. Branch manager  — if the booking has a branch_id and that branch has
 *     at least one manager assigned in `branch_users`, the FIRST manager
 *     receives the notification.
 *  2. Vendor owner    — fallback; uses the owner's login email/phone from
 *     `users` (more reliable than the business email column on `vendors`).
 */
export async function resolveBookingRecipient(
  branchId: string | null | undefined,
  vendorId: string,
): Promise<{
  email: string | null;
  phone: string | null;
  userId: string | null;
}> {
  const supabase = getServiceClient();

  // 1 — Try branch manager
  if (branchId) {
    const { data: managers } = await supabase
      .from("branch_users")
      .select("user_id, users(email, phone)")
      .eq("branch_id", branchId)
      .eq("role", "manager")
      .limit(1);

    const mgr = managers?.[0] as
      | {
          user_id: string;
          users:
            | { email?: string; phone?: string }
            | { email?: string; phone?: string }[]
            | null;
        }
      | undefined;

    if (mgr) {
      const u = Array.isArray(mgr.users) ? mgr.users[0] : mgr.users;
      return {
        userId: mgr.user_id,
        email: u?.email ?? null,
        phone: u?.phone ?? null,
      };
    }
  }

  // 2 — Fall back to vendor owner
  const { data: vendor } = await supabase
    .from("vendors")
    .select("user_id, email, phone")
    .eq("id", vendorId)
    .single();

  if (!vendor) return { email: null, phone: null, userId: null };

  const ownerUser = vendor.user_id
    ? (
        await supabase
          .from("users")
          .select("email, phone")
          .eq("id", vendor.user_id)
          .single()
      ).data
    : null;

  return {
    userId: vendor.user_id ?? null,
    email: ownerUser?.email ?? vendor.email ?? null,
    phone: ownerUser?.phone ?? vendor.phone ?? null,
  };
}

// ── Email HTML helpers ─────────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";

// Logo hosted on Supabase Storage (public bucket) — accessible without auth, no cookies required
const LOGO_URL =
  "https://ldscfwokohxoxdtyqzzz.supabase.co/storage/v1/object/public/assets/warshety-footer.svg";

// ── Inline-style helpers (Gmail strips <style> blocks) ───────────────────────

const S = {
  badge: (bg: string, color: string) =>
    `display:inline-block;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.4px;margin-bottom:20px;background:${bg};color:${color}`,
  title:
    "font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;line-height:1.3;font-family:Arial,sans-serif",
  subtitle:
    "font-size:14px;color:#64748b;margin:0 0 24px;line-height:1.6;font-family:Arial,sans-serif",
  infoBox:
    "background:#f8fafc;border-radius:10px;padding:14px 18px;margin-bottom:10px",
  infoLabel:
    "font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 4px;font-family:Arial,sans-serif",
  infoValue:
    "font-size:15px;font-weight:600;color:#1e293b;margin:0;font-family:Arial,sans-serif",
  btn: "display:inline-block;background:#f97316;color:#ffffff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;font-family:Arial,sans-serif",
  btnDanger:
    "display:inline-block;background:#dc2626;color:#ffffff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;font-family:Arial,sans-serif",
  amountBig:
    "font-size:32px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;font-family:Arial,sans-serif",
  amountDanger:
    "font-size:32px;font-weight:800;color:#dc2626;letter-spacing:-0.5px;font-family:Arial,sans-serif",
};

function infoRow(label: string, value: string): string {
  return `<div style="${S.infoBox}"><p style="${S.infoLabel}">${label}</p><p style="${S.infoValue}">${value}</p></div>`;
}

function ctaButton(href: string, text: string, danger = false): string {
  return `<div style="text-align:center;margin:28px 0 8px"><a href="${href}" style="${danger ? S.btnDanger : S.btn}">${text}</a></div>`;
}

function emailWrapper(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f5;padding:32px 16px">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%">

        <!-- Header -->
        <tr><td style="background:#0f172a;border-radius:16px 16px 0 0;padding:20px 40px;text-align:center">
          <img src="${LOGO_URL}" alt="Warshety" height="56" style="display:block;margin:0 auto;border:0"/>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:40px 40px 32px">
          ${bodyHtml}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#1e293b;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center">
          <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6;font-family:Arial,sans-serif">
            &copy; ${new Date().getFullYear()} Warshety &nbsp;&middot;&nbsp;
            <a href="${APP_URL}" style="color:#f97316;text-decoration:none">warshety.com</a>
          </p>
          <p style="font-size:12px;color:#64748b;margin:6px 0 0;font-family:Arial,sans-serif">
            You received this because you have an active account on the platform.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Customer event notifications ───────────────────────────────────────────────

/**
 * 1. Booking Confirmed — sent when vendor confirms booking.
 */
export async function notifyCustomerBookingConfirmed({
  userId,
  phone,
  email,
  customerName,
  centerName,
  dateTime,
  bookingId,
  mapsLink,
}: {
  userId?: string;
  phone?: string;
  email?: string;
  customerName?: string;
  centerName: string;
  dateTime: string;
  bookingId: string;
  mapsLink?: string;
}): Promise<void> {
  if (phone) {
    const smsParts = [
      `Your booking at ${centerName} is confirmed for ${dateTime}`,
      mapsLink ? `📍 Get directions: ${mapsLink}` : "",
    ]
      .filter(Boolean)
      .join(" — ");
    await sendSMS(phone, smsParts, {
      userId,
      eventType: "booking_confirmed",
      idempotencyKey: bookingId,
    });
  }

  if (email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";
    const bookingLink = `${appUrl}/en/bookings/${bookingId}`;
    const greeting = customerName ? `Hi ${customerName},` : "Hi,";
    const mapsRowHtml = mapsLink
      ? `<div style="background:#f8fafc;border-radius:10px;padding:14px 18px;margin-bottom:10px">
          <p style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 8px;font-family:Arial,sans-serif">LOCATION</p>
          <a href="${mapsLink}" style="display:inline-block;background:#1a73e8;color:#ffffff;font-size:13px;font-weight:700;padding:9px 20px;border-radius:8px;text-decoration:none;font-family:Arial,sans-serif">📍 Open in Google Maps</a>
        </div>`
      : "";
    const html = emailWrapper(
      "Booking Confirmed ✓",
      `<span style="${S.badge("#dcfce7", "#166534")}">✓ Booking Confirmed</span>
    <p style="${S.title}">Your booking is confirmed!</p>
    <p style="${S.subtitle}">${greeting} your appointment has been booked successfully.</p>
    ${infoRow("Service Center", centerName)}
    ${infoRow("Date &amp; Time", dateTime)}
    ${infoRow("Booking ID", `<span style="font-size:13px;font-weight:500;color:#64748b">${bookingId.slice(0, 8).toUpperCase()}</span>`)}
    ${mapsRowHtml}
    ${ctaButton(bookingLink, "View Booking")}`,
    );
    await sendEmail(email, `Booking Confirmed at ${centerName}`, html, {
      userId,
      eventType: "booking_confirmed",
      idempotencyKey: bookingId,
    });
  }
}

/**
 * 2. Booking Reminder — sent ~2 hours before appointment.
 */
export async function notifyCustomerBookingReminder({
  userId,
  phone,
  email,
  customerName,
  centerName,
  time,
  bookingId,
}: {
  userId?: string;
  phone?: string;
  email?: string;
  customerName?: string;
  centerName: string;
  time: string;
  bookingId?: string;
}): Promise<void> {
  if (phone) {
    await sendSMS(
      phone,
      `Reminder: your booking at ${centerName} is at ${time}`,
      {
        userId,
        eventType: "booking_reminder",
        windowHours: 0,
        idempotencyKey: bookingId,
      },
    );
  }

  if (email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";
    const bookingLink = bookingId
      ? `${appUrl}/en/bookings/${bookingId}`
      : `${appUrl}/en/bookings`;
    const greeting = customerName ? `Hi ${customerName},` : "Hi,";
    const html = emailWrapper(
      "Booking Reminder",
      `<span style="${S.badge("#fef3c7", "#92400e")}">⏰ Reminder</span>
    <p style="${S.title}">Your appointment is coming up!</p>
    <p style="${S.subtitle}">${greeting} just a reminder about your upcoming booking.</p>
    ${infoRow("Service Center", centerName)}
    ${infoRow("Time", time)}
    ${ctaButton(bookingLink, "View Booking")}`,
    );
    await sendEmail(
      email,
      `Reminder: Your appointment at ${centerName} is at ${time}`,
      html,
      {
        userId,
        eventType: "booking_reminder",
        windowHours: 0,
        idempotencyKey: bookingId,
      },
    );
  }
}

/**
 * 3. Car Ready for Pickup — sent when vendor marks car ready.
 */
export async function notifyCustomerCarReady({
  userId,
  phone,
  email,
  customerName,
  centerName,
  bookingId,
}: {
  userId?: string;
  phone?: string;
  email?: string;
  customerName?: string;
  centerName: string;
  bookingId?: string;
}): Promise<void> {
  if (phone) {
    await sendSMS(phone, `Your car is ready for pickup at ${centerName}`, {
      userId,
      eventType: "car_ready",
      windowHours: 0,
      idempotencyKey: bookingId,
    });
  }

  if (email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";
    const bookingLink = bookingId
      ? `${appUrl}/en/bookings/${bookingId}`
      : `${appUrl}/en/bookings`;
    const greeting = customerName ? `Hi ${customerName},` : "Hi,";
    const html = emailWrapper(
      "Your Car is Ready 🚗",
      `<span style="${S.badge("#dcfce7", "#166534")}">🚗 Ready for Pickup</span>
    <p style="${S.title}">Your car is ready!</p>
    <p style="${S.subtitle}">${greeting} your vehicle has been serviced and is ready for collection.</p>
    ${infoRow("Service Center", centerName)}
    ${ctaButton(bookingLink, "View Booking")}`,
    );
    await sendEmail(
      email,
      `Your car is ready for pickup at ${centerName}`,
      html,
      {
        userId,
        eventType: "car_ready",
        windowHours: 0,
        idempotencyKey: bookingId,
      },
    );
  }
}

/**
 * Booking Cancelled — sent to customer when a vendor cancels their booking.
 */
export async function notifyCustomerBookingCancelled({
  userId,
  phone,
  email,
  customerName,
  centerName,
  reason,
  bookingId,
}: {
  userId?: string;
  phone?: string;
  email?: string;
  customerName?: string;
  centerName: string;
  reason?: string;
  bookingId?: string;
}): Promise<void> {
  const smsMsg = reason
    ? `Your booking at ${centerName} has been cancelled. Reason: ${reason}`
    : `Your booking at ${centerName} has been cancelled`;

  if (phone) {
    await sendSMS(phone, smsMsg, {
      userId,
      eventType: "booking_cancelled",
      windowHours: 0,
      idempotencyKey: bookingId,
    });
  }

  if (email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";
    const bookingsLink = bookingId
      ? `${appUrl}/en/bookings/${bookingId}`
      : `${appUrl}/en/bookings`;
    const greeting = customerName ? `Hi ${customerName},` : "Hi,";
    const html = emailWrapper(
      "Booking Cancelled",
      `<span style="${S.badge("#fee2e2", "#991b1b")}">✕ Booking Cancelled</span>
    <p style="${S.title}">Your booking has been cancelled</p>
    <p style="${S.subtitle}">${greeting} unfortunately your booking at ${centerName} has been cancelled.</p>
    ${infoRow("Service Center", centerName)}
    ${reason ? infoRow("Reason", reason) : ""}
    ${ctaButton(bookingsLink, "View My Bookings")}`,
    );
    await sendEmail(
      email,
      `Your booking at ${centerName} has been cancelled`,
      html,
      {
        userId,
        eventType: "booking_cancelled",
        windowHours: 0,
        idempotencyKey: bookingId,
      },
    );
  }
}

// (Order notifications removed — platform is service-center only)

// Kept for future use placeholder
// ── Vendor event notifications ────────────────────────────────────────────────

/**
 * 5. New Booking — sent to vendor when a booking is created.
 */
export async function notifyVendorNewBooking({
  vendorUserId,
  vendorPhone,
  vendorEmail,
  customerName,
  service,
  dateTime,
  bookingId,
  dashboardLink,
}: {
  vendorUserId?: string;
  vendorPhone: string;
  vendorEmail: string;
  customerName: string;
  service: string;
  dateTime: string;
  bookingId: string;
  dashboardLink?: string;
}): Promise<void> {
  await sendSMS(vendorPhone, `New booking request received`, {
    userId: vendorUserId,
    eventType: "new_booking_vendor",
    idempotencyKey: bookingId,
  });

  const html = emailWrapper(
    "New Booking Request",
    `<span style="${S.badge("#dcfce7", "#166534")}">🗓 New Booking</span>
    <p style="${S.title}">You have a new booking request</p>
    <p style="${S.subtitle}">A customer has booked an appointment at your service center.</p>
    ${infoRow("Customer", customerName)}
    ${infoRow("Service", service)}
    ${infoRow("Date &amp; Time", dateTime)}
    ${infoRow("Booking ID", `<span style="font-size:13px;font-weight:500;color:#64748b">${bookingId}</span>`)}
    ${dashboardLink ? ctaButton(dashboardLink, "Open Dashboard") : ""}`,
  );

  await sendEmail(vendorEmail, "New Booking Request", html, {
    userId: vendorUserId,
    eventType: "new_booking_vendor",
    idempotencyKey: bookingId,
  });
}

/**
 * 7. Payment Due — vendor has an outstanding balance.
 * Rate-limited: max 1 SMS + 1 Email per day (windowHours = 24).
 */
export async function notifyVendorPaymentDue({
  vendorUserId,
  vendorPhone,
  vendorEmail,
  amountEGP,
  dueDate,
  breakdown,
  billingLink,
}: {
  vendorUserId?: string;
  vendorPhone: string;
  vendorEmail: string;
  amountEGP: number;
  dueDate: string;
  breakdown?: Array<{ label: string; amount: number }>;
  billingLink?: string;
}): Promise<void> {
  await sendSMS(
    vendorPhone,
    `Payment due: You have an outstanding balance of ${amountEGP.toFixed(2)} EGP`,
    { userId: vendorUserId, eventType: "payment_due", windowHours: 0 },
  );

  const breakdownHtml = breakdown?.length
    ? `<hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0"/>
       <p style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;font-family:Arial,sans-serif">Breakdown</p>
       ${breakdown.map((b) => infoRow(b.label, `${b.amount.toFixed(2)} EGP`)).join("")}`
    : "";

  const html = emailWrapper(
    "Payment Due",
    `<span style="${S.badge("#fef3c7", "#92400e")}">⚠️ Payment Due</span>
    <p style="${S.title}">You have an outstanding balance</p>
    <p style="${S.subtitle}">Please settle your balance before the due date to keep your account in good standing.</p>
    ${infoRow("Amount Due", `<span style="${S.amountBig}">${amountEGP.toFixed(2)}</span> EGP`)}
    ${infoRow("Due Date", dueDate)}
    ${breakdownHtml}
    ${billingLink ? ctaButton(billingLink, "Pay Now") : ""}`,
  );

  await sendEmail(vendorEmail, "Payment Due — Action Required", html, {
    userId: vendorUserId,
    eventType: "payment_due",
    windowHours: 0,
  });
}

/**
 * 8. Payment Overdue — HIGH PRIORITY, past due date.
 * Rate-limited: max 1 SMS + 1 Email per day (windowHours = 24).
 */
export async function notifyVendorPaymentOverdue({
  vendorUserId,
  vendorPhone,
  vendorEmail,
  amountEGP,
  daysOverdue,
  billingLink,
}: {
  vendorUserId?: string;
  vendorPhone: string;
  vendorEmail: string;
  amountEGP: number;
  daysOverdue: number;
  billingLink?: string;
}): Promise<void> {
  await sendSMS(
    vendorPhone,
    `URGENT: Your payment of ${amountEGP.toFixed(2)} EGP is overdue`,
    { userId: vendorUserId, eventType: "payment_overdue", windowHours: 0 },
  );

  const html = emailWrapper(
    "Payment Overdue",
    `<span style="${S.badge("#fee2e2", "#991b1b")}">🚨 OVERDUE</span>
    <p style="${S.title}">Your payment is overdue</p>
    <p style="${S.subtitle}">Please settle immediately to avoid service suspension on your Warshety account.</p>
    ${infoRow("Overdue Amount", `<span style="${S.amountDanger}">${amountEGP.toFixed(2)}</span> EGP`)}
    ${infoRow("Days Overdue", `<span style="color:#dc2626">${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}</span>`)}
    ${billingLink ? ctaButton(billingLink, "Pay Now — Urgent", true) : ""}`,
  );

  await sendEmail(
    vendorEmail,
    `URGENT: Payment of ${amountEGP.toFixed(2)} EGP Overdue`,
    html,
    { userId: vendorUserId, eventType: "payment_overdue", windowHours: 0 },
  );
}

/**
 * 9. Vendor Application Approved — sent when admin approves a vendor application.
 * Rate-limited: max 1 email per vendor (idempotencyKey = vendorId/userId).
 */
export async function notifyVendorApprovedEmail({
  vendorUserId,
  vendorEmail,
  businessName,
  ownerName,
  dashboardLink,
}: {
  vendorUserId?: string;
  vendorEmail: string;
  businessName: string;
  ownerName?: string;
  dashboardLink?: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";
  const link = dashboardLink ?? `${appUrl}/en/vendor/dashboard`;
  const greeting = ownerName ? `Hi ${ownerName},` : "Hi,";

  const html = emailWrapper(
    "Your Vendor Application is Approved 🎉",
    `<span style="${S.badge("#dcfce7", "#166534")}">🎉 Application Approved</span>
    <p style="${S.title}">Welcome to Warshety!</p>
    <p style="${S.subtitle}">${greeting} great news — your vendor application for <strong>${businessName}</strong> has been approved. Your account is now active and ready to go.</p>
    ${infoRow("Business Name", businessName)}
    ${infoRow("Status", '<span style="color:#16a34a;font-weight:700">✓ Approved &amp; Active</span>')}
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 18px;margin:20px 0">
      <p style="font-size:13px;color:#166534;margin:0;line-height:1.6;font-family:Arial,sans-serif">
        You can now log in with the email and password you chose during your application. Set up your profile, add your services, and start receiving bookings.
      </p>
    </div>
    ${ctaButton(link, "Go to Your Dashboard")}`,
  );

  await sendEmail(
    vendorEmail,
    `Your Warshety vendor account is approved — ${businessName}`,
    html,
    {
      userId: vendorUserId,
      eventType: "vendor_approved",
      windowHours: 0,
      idempotencyKey: vendorUserId ?? vendorEmail,
    },
  );
}

/**
 * Booking Completed + Points Earned — combined notification.
 * Sent when vendor marks a booking as 'completed'. Points are awarded by a
 * DB trigger; this function reads the latest total after the update.
 */
export async function notifyCustomerBookingCompleted({
  userId,
  phone,
  email,
  customerName,
  centerName,
  bookingId,
  pointsEarned,
}: {
  userId?: string;
  phone?: string;
  email?: string;
  customerName?: string;
  centerName: string;
  bookingId?: string;
  pointsEarned?: number;
}): Promise<void> {
  const hasPoints = typeof pointsEarned === "number" && pointsEarned > 0;
  const pointsSuffix = hasPoints ? ` You earned ${pointsEarned} points!` : "";

  if (phone) {
    await sendSMS(
      phone,
      `Your service at ${centerName} is complete.${pointsSuffix} Thank you for choosing Warshety!`,
      {
        userId,
        eventType: "booking_completed",
        windowHours: 0,
        idempotencyKey: bookingId,
      },
    );
  }

  if (email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";
    const bookingLink = bookingId
      ? `${appUrl}/en/bookings/${bookingId}`
      : `${appUrl}/en/bookings`;
    const rewardsLink = `${appUrl}/en/rewards`;
    const greeting = customerName ? `Hi ${customerName},` : "Hi,";
    const pointsHtml = hasPoints
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 18px;margin:20px 0;text-align:center">
          <p style="font-size:13px;font-weight:600;color:#166534;margin:0 0 4px;font-family:Arial,sans-serif">🏆 Loyalty Points Earned</p>
          <p style="font-size:30px;font-weight:800;color:#16a34a;margin:0;font-family:Arial,sans-serif">+${pointsEarned} pts</p>
          <p style="font-size:12px;color:#4ade80;margin:4px 0 0;font-family:Arial,sans-serif">Redeemable in your rewards wallet</p>
        </div>`
      : "";
    const rewardsCtaHtml = hasPoints
      ? `<div style="text-align:center;margin-top:8px"><a href="${rewardsLink}" style="font-size:13px;color:#f97316;font-family:Arial,sans-serif">View your rewards wallet →</a></div>`
      : "";

    const html = emailWrapper(
      "Service Completed ✓",
      `<span style="${S.badge("#dcfce7", "#166534")}">✓ Service Completed</span>
    <p style="${S.title}">Your service is done!</p>
    <p style="${S.subtitle}">${greeting} your vehicle service at <strong>${centerName}</strong> has been completed successfully.</p>
    ${infoRow("Service Center", centerName)}
    ${bookingId ? infoRow("Booking ID", `<span style="font-size:13px;font-weight:500;color:#64748b">${bookingId.slice(0, 8).toUpperCase()}</span>`) : ""}
    ${pointsHtml}
    ${ctaButton(bookingLink, "View Booking")}
    ${rewardsCtaHtml}`,
    );

    await sendEmail(email, `Your service at ${centerName} is complete`, html, {
      userId,
      eventType: "booking_completed",
      windowHours: 0,
      idempotencyKey: bookingId,
    });
  }
}

/**
 * Vendor notified when a customer cancels their own booking.
 * Separate from notifyCustomerBookingCancelled (which tells the customer
 * that the vendor cancelled).
 */
export async function notifyVendorBookingCancelledByCustomer({
  vendorUserId,
  vendorPhone,
  vendorEmail,
  customerName,
  service,
  dateTime,
  bookingId,
  dashboardLink,
}: {
  vendorUserId?: string;
  vendorPhone?: string;
  vendorEmail: string;
  customerName?: string;
  service?: string;
  dateTime?: string;
  bookingId: string;
  dashboardLink?: string;
}): Promise<void> {
  if (vendorPhone) {
    const smsMsg = [
      "Booking cancelled by customer",
      customerName ? `(${customerName})` : null,
      service ? `for ${service}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    await sendSMS(vendorPhone, smsMsg, {
      userId: vendorUserId,
      eventType: "vendor_booking_cancelled",
      idempotencyKey: bookingId,
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";
  const link = dashboardLink ?? `${appUrl}/en/vendor/bookings`;

  const html = emailWrapper(
    "Booking Cancelled by Customer",
    `<span style="${S.badge("#fee2e2", "#991b1b")}">✕ Booking Cancelled</span>
    <p style="${S.title}">A customer has cancelled their booking</p>
    <p style="${S.subtitle}">The following appointment was cancelled by the customer.</p>
    ${customerName ? infoRow("Customer", customerName) : ""}
    ${service ? infoRow("Service", service) : ""}
    ${dateTime ? infoRow("Date &amp; Time", dateTime) : ""}
    ${infoRow("Booking ID", `<span style="font-size:13px;font-weight:500;color:#64748b">${bookingId.slice(0, 8).toUpperCase()}</span>`)}
    ${ctaButton(link, "View Bookings")}`,
  );

  await sendEmail(vendorEmail, "Booking Cancelled by Customer", html, {
    userId: vendorUserId,
    eventType: "vendor_booking_cancelled",
    idempotencyKey: bookingId,
  });
}

/**
 * Application Received — confirmation email sent to vendor applicant immediately
 * after their application is submitted. Lets them know it's under review.
 */
export async function notifyApplicationReceived({
  applicantEmail,
  ownerName,
  businessName,
}: {
  applicantEmail: string;
  ownerName?: string;
  businessName: string;
}): Promise<void> {
  const greeting = ownerName ? `Hi ${ownerName},` : "Hi,";

  const html = emailWrapper(
    "Application Received",
    `<span style="${S.badge("#fef3c7", "#92400e")}">📋 Application Received</span>
    <p style="${S.title}">We've received your application!</p>
    <p style="${S.subtitle}">${greeting} thank you for applying to join Warshety as a service center.</p>
    ${infoRow("Business Name", businessName)}
    ${infoRow("Status", '<span style="color:#92400e;font-weight:700">⏳ Under Review</span>')}
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;margin:20px 0">
      <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6;font-family:Arial,sans-serif">
        Our team will review your application within 2–3 business days. You will receive an email notification once a decision has been made. No action is required from you at this time.
      </p>
    </div>`,
  );

  await sendEmail(
    applicantEmail,
    `Application received — ${businessName}`,
    html,
    {
      eventType: "application_received",
      windowHours: 0,
      // Idempotency key = email so re-submissions don't spam the applicant
      idempotencyKey: applicantEmail,
    },
  );
}

/**
 * Vendor Application Rejected — outbound email to the applicant.
 * Only sends once per email address (idempotencyKey = vendorEmail).
 */
export async function notifyVendorRejectedEmail({
  vendorEmail,
  ownerName,
  businessName,
  reason,
}: {
  vendorEmail: string;
  ownerName?: string;
  businessName: string;
  reason?: string;
}): Promise<void> {
  const greeting = ownerName ? `Hi ${ownerName},` : "Hi,";
  const reasonHtml = reason ? infoRow("Reason", reason) : "";

  const html = emailWrapper(
    "Application Update — Warshety",
    `<span style="${S.badge("#fee2e2", "#991b1b")}">Application Update</span>
    <p style="${S.title}">Your application was not approved</p>
    <p style="${S.subtitle}">${greeting} after reviewing your application for <strong>${businessName}</strong>, we are unable to approve it at this time.</p>
    ${reasonHtml}
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 18px;margin:20px 0">
      <p style="font-size:13px;color:#991b1b;margin:0;line-height:1.6;font-family:Arial,sans-serif">
        If you believe this decision was made in error or would like to address the concerns raised, please contact our support team.
      </p>
    </div>`,
  );

  await sendEmail(
    vendorEmail,
    `Your Warshety vendor application — ${businessName}`,
    html,
    {
      eventType: "vendor_rejected",
      windowHours: 0,
      idempotencyKey: vendorEmail,
    },
  );
}

/**
 * Vendor Daily Booking Summary — one email per vendor listing all tomorrow's bookings.
 * Called by the /api/cron/reminders route each morning.
 */
export async function notifyVendorDailyBookingSummary({
  vendorUserId,
  vendorEmail,
  businessName,
  bookings,
  date,
  dashboardLink,
}: {
  vendorUserId?: string;
  vendorEmail: string;
  businessName: string;
  bookings: Array<{
    customerName: string;
    service: string;
    time: string;
    bookingId: string;
  }>;
  date: string;
  dashboardLink?: string;
}): Promise<void> {
  if (bookings.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";
  const link = dashboardLink ?? `${appUrl}/en/vendor/bookings`;

  const bookingRows = bookings
    .map(
      (b) =>
        `<tr>
          <td style="padding:10px 14px;font-size:13px;color:#1e293b;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9">${b.time}</td>
          <td style="padding:10px 14px;font-size:13px;color:#1e293b;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9">${b.customerName}</td>
          <td style="padding:10px 14px;font-size:13px;color:#64748b;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9">${b.service}</td>
        </tr>`,
    )
    .join("");

  const tableHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:20px 0;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:10px 14px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;text-align:left;font-family:Arial,sans-serif">Time</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;text-align:left;font-family:Arial,sans-serif">Customer</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;text-align:left;font-family:Arial,sans-serif">Service</th>
        </tr>
      </thead>
      <tbody>${bookingRows}</tbody>
    </table>`;

  const html = emailWrapper(
    `Tomorrow's Bookings — ${businessName}`,
    `<span style="${S.badge("#dbeafe", "#1e40af")}">📅 Daily Summary</span>
    <p style="${S.title}">Tomorrow's schedule for ${businessName}</p>
    <p style="${S.subtitle}">You have <strong>${bookings.length} booking${bookings.length !== 1 ? "s" : ""}</strong> scheduled for <strong>${date}</strong>.</p>
    ${tableHtml}
    ${ctaButton(link, "Open Dashboard")}`,
  );

  await sendEmail(
    vendorEmail,
    `Tomorrow's bookings (${bookings.length}) — ${businessName}`,
    html,
    {
      userId: vendorUserId,
      eventType: "booking_reminder",
      windowHours: 20, // Don't re-send within 20h (once per day)
      idempotencyKey: `${vendorEmail}::daily::${date}`,
    },
  );
}
