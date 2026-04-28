/**
 * bostaService — Bosta last-mile delivery integration.
 *
 * Bosta API docs: https://app.bosta.co/developers/docs
 *
 * Flow:
 *  1. Vendor confirms order is ready → call createShipment()
 *  2. Bosta assigns a tracking number → we save it to orders table
 *  3. Bosta pushes status updates via webhook → handleWebhook()
 *  4. On "Delivered" webhook → trigger payout + mark order completed
 *
 * Environment variables required:
 *   BOSTA_API_KEY      — your Bosta API key
 *   BOSTA_API_BASE_URL — e.g. https://app.bosta.co/api/v2  (or sandbox URL)
 *   BOSTA_WEBHOOK_SECRET — HMAC secret to verify incoming webhooks (optional but recommended)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BostaAddress {
  /** First line of street address */
  firstLine: string;
  secondLine?: string;
  /** Bosta city code, e.g. "Cairo", "Alexandria" */
  city: string;
  /** Bosta zone / district name (optional) */
  zone?: string;
  /** Bosta district code (optional) */
  district?: string;
  buildingNumber?: string;
  floor?: string;
  apartment?: string;
}

export interface BostaContact {
  name: string;
  phone: string;
}

export interface BostaPackage {
  /** Package weight in kg */
  weight?: number;
  /** Number of items in the package */
  itemsCount?: number;
  /** Cash-on-delivery amount (0 for pre-paid orders) */
  cod?: number;
  description?: string;
}

export interface CreateShipmentInput {
  /** Internal order ID (used as reference) */
  orderId: string;
  /** Who we're picking up from */
  pickup: {
    address: BostaAddress;
    contact: BostaContact;
  };
  /** Where we're delivering to */
  dropoff: {
    address: BostaAddress;
    contact: BostaContact;
  };
  pkg: BostaPackage;
  /** Optional: scheduled pickup date (ISO string) — leave undefined for ASAP */
  pickupDate?: string;
}

export interface CreateShipmentResult {
  shipmentId: string;
  trackingNumber: string;
  trackingUrl: string;
  error: null;
}

export interface ShipmentError {
  shipmentId: null;
  trackingNumber: null;
  trackingUrl: null;
  error: string;
}

// ── Bosta webhook event state codes ─────────────────────────────────────────
// Full list: https://app.bosta.co/developers/docs#tracking-states
export type BostaStateCode =
  | "CREATED" // Shipment created
  | "PICKED_UP" // Picked up from seller
  | "IN_TRANSIT" // Moving through Bosta network
  | "OUT_FOR_DELIVERY" // With courier, delivering today
  | "DELIVERED" // Successfully delivered ✅
  | "WAITING_FOR_CUSTOMER_ACTION" // Customer unreachable
  | "DELIVERY_FAILED" // Failed attempt
  | "RETURNED" // Returned to sender
  | "CANCELLED"; // Shipment cancelled

export interface BostaWebhookPayload {
  /** Bosta shipment ID */
  _id: string;
  /** Bosta tracking number shown to customer */
  trackingNumber: string;
  /** Your reference (the order ID we passed when creating) */
  businessReference: string;
  state: {
    code: BostaStateCode;
    value: string; // human-readable Arabic/English label
  };
  updateTime: string; // ISO timestamp
  reason?: string; // failure reason if applicable
  nextAttempt?: string; // next delivery attempt date
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function baseUrl(): string {
  return process.env.BOSTA_API_BASE_URL ?? "https://app.bosta.co/api/v2";
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.BOSTA_API_KEY ?? ""}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a shipment request with Bosta.
 * Returns the Bosta shipment ID and tracking number on success.
 */
export async function createShipment(
  input: CreateShipmentInput,
): Promise<CreateShipmentResult | ShipmentError> {
  const body = {
    // Bosta "SEND" delivery type = standard forward shipment
    type: 10,
    businessReference: input.orderId,
    specs: {
      packageDetails: {
        weight: input.pkg.weight ?? 1,
        itemsCount: input.pkg.itemsCount ?? 1,
        description: input.pkg.description ?? "Auto Parts",
      },
    },
    cod: input.pkg.cod ?? 0,
    pickupAddress: formatAddress(input.pickup.address),
    dropOffAddress: formatAddress(input.dropoff.address),
    receiver: {
      firstName:
        input.dropoff.contact.name.split(" ")[0] ?? input.dropoff.contact.name,
      lastName: input.dropoff.contact.name.split(" ").slice(1).join(" ") || "-",
      phone: input.dropoff.contact.phone,
    },
    notes: input.pkg.description,
    ...(input.pickupDate ? { pickupDate: input.pickupDate } : {}),
  };

  try {
    const res = await fetch(`${baseUrl()}/deliveries`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        shipmentId: null,
        trackingNumber: null,
        trackingUrl: null,
        error: json?.message ?? json?.error ?? `Bosta API error ${res.status}`,
      };
    }

    const shipmentId: string = json._id ?? json.id;
    const trackingNumber: string = json.trackingNumber ?? json.Tracking_Number;

    return {
      shipmentId,
      trackingNumber,
      trackingUrl: `https://tracking.bosta.co/shipments/track/${trackingNumber}`,
      error: null,
    };
  } catch (err: unknown) {
    return {
      shipmentId: null,
      trackingNumber: null,
      trackingUrl: null,
      error:
        err instanceof Error ? err.message : "Network error contacting Bosta",
    };
  }
}

/**
 * Cancel an existing Bosta shipment (e.g. on order cancellation).
 */
export async function cancelShipment(
  bostaShipmentId: string,
): Promise<{ error: string | null }> {
  try {
    const res = await fetch(
      `${baseUrl()}/deliveries/${bostaShipmentId}/terminate`,
      { method: "PUT", headers: headers() },
    );
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { error: json?.message ?? `Bosta cancel error ${res.status}` };
    }
    return { error: null };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Verify that an incoming webhook request is from Bosta.
 * Bosta signs the payload with HMAC-SHA256 using your BOSTA_WEBHOOK_SECRET.
 * Returns true if the signature matches.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const secret = process.env.BOSTA_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification if no secret configured

  if (!signatureHeader) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = Buffer.from(sig).toString("hex");

  return expected === signatureHeader;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatAddress(addr: BostaAddress) {
  return {
    city: { name: addr.city },
    zone: addr.zone ? { name: addr.zone } : undefined,
    district: addr.district ? { name: addr.district } : undefined,
    firstLine: addr.firstLine,
    secondLine: addr.secondLine,
    buildingNumber: addr.buildingNumber,
    floor: addr.floor,
    apartment: addr.apartment,
  };
}
