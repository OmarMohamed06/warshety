/**
 * bostaService — Bosta last-mile delivery integration.
 *
 * Bosta API docs: https://docs.bosta.co/docs/category/how-to
 * API base: https://app.bosta.co/api/v2
 *
 * Flow:
 *  1. Vendor confirms order is ready → call createShipment()
 *  2. Bosta assigns a tracking number → we save it to orders table
 *  3. Bosta pushes status updates via webhook → handleWebhook()
 *  4. On Delivered (state 45) webhook → trigger payout + mark order completed
 *
 * Environment variables required:
 *   BOSTA_API_KEY      — your Bosta API key (no "Bearer" prefix needed)
 *   BOSTA_API_BASE_URL — e.g. https://app.bosta.co/api/v2  (or sandbox URL)
 *   BOSTA_WEBHOOK_SECRET — value of the Authorization header Bosta sends with webhooks (optional)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BostaAddress {
  /** First line of street address (must be ≥ 5 characters) */
  firstLine: string;
  secondLine?: string;
  /** City name from Bosta city list, e.g. "Cairo", "Alexandria" */
  city: string;
  /** District ID from GET /cities/getAllDistricts — preferred over districtName */
  districtId?: string;
  /** District name — used together with cityId when districtId is unavailable */
  districtName?: string;
  /** City ID from GET /cities?countryId=... — required when using districtName */
  cityId?: string;
  /** Zone ID from GET /cities/{cityId}/zones */
  zoneId?: string;
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
  /** Where we're delivering to (customer address) */
  dropoff: {
    address: BostaAddress;
    contact: BostaContact;
  };
  pkg: BostaPackage;
  /**
   * Bosta business location ID (registered in Bosta dashboard).
   * If omitted, Bosta will use your default pickup location.
   */
  businessLocationId?: string;
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

/**
 * Numeric state codes sent by Bosta in webhook payloads.
 * Docs: https://docs.bosta.co/docs/how-to/get-delivery-status-via-webhook#bosta-states
 */
export type BostaStateCode =
  | 10 // Pickup requested (new)
  | 20 // Route assigned
  | 21 // Picked up from business
  | 22 // Picking up from consignee (exchange/CRP)
  | 23 // Picked up from consignee
  | 24 // Received at warehouse
  | 25 // Fulfilled (fulfillment)
  | 30 // In transit between hubs
  | 40 // Picking up (cash collection)
  | 41 // Out for delivery
  | 45 // Delivered ✅
  | 46 // Returned to business
  | 47 // Exception (NDR — non-delivery report)
  | 48 // Terminated
  | 49 // Cancelled
  | 100 // Lost
  | 101 // Damaged
  | 102 // Investigation
  | 103 // Awaiting your action
  | 104 // Archived
  | 105; // On hold

export interface BostaWebhookPayload {
  /** Bosta shipment ID */
  _id: string;
  /** Bosta tracking number */
  trackingNumber: number | string;
  /** Your reference (the order ID we passed when creating) */
  businessReference: string;
  /** Numeric state code — see BostaStateCode */
  state: BostaStateCode;
  /** Order type: "SEND" | "EXCHANGE" | "CRP" | "RTO" etc. */
  type: string;
  /** Timestamp (epoch ms) when state changed */
  timeStamp: number;
  /** COD amount collected — only present on state 45 */
  cod?: number;
  /** Delivery promise date (DD-MM-YYYY format) */
  deliveryPromiseDate?: string;
  /** NDR exception reason string */
  exceptionReason?: string;
  /** NDR exception code */
  exceptionCode?: number;
  /** Number of delivery attempts made */
  numberOfAttempts?: number;
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
    // Bosta uses plain API key — no "Bearer" prefix
    Authorization: process.env.BOSTA_API_KEY ?? "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a "Deliver" shipment with Bosta (type 10).
 * Pickup location is resolved from the vendor's registered Bosta business location.
 * Returns the Bosta shipment ID and tracking number on success.
 */
export async function createShipment(
  input: CreateShipmentInput,
): Promise<CreateShipmentResult | ShipmentError> {
  const receiverName = input.dropoff.contact.name.trim();
  const nameParts = receiverName.split(" ");
  const firstName = nameParts[0] ?? receiverName;
  const lastName = nameParts.slice(1).join(" ") || "-";

  const body: Record<string, unknown> = {
    // Bosta delivery type 10 = standard "Deliver" (forward shipment)
    type: 10,
    businessReference: input.orderId,
    specs: {
      packageDetails: {
        itemsCount: input.pkg.itemsCount ?? 1,
        description: input.pkg.description ?? "Auto Parts",
      },
    },
    cod: input.pkg.cod ?? 0,
    // dropOffAddress = customer delivery address (required for type 10)
    dropOffAddress: formatAddress(input.dropoff.address),
    receiver: {
      firstName,
      lastName,
      phone: input.dropoff.contact.phone,
    },
    notes: input.pkg.description ?? null,
  };

  // Use registered Bosta business location ID if provided;
  // otherwise Bosta falls back to the account's default pickup location.
  if (input.businessLocationId) {
    body.businessLocationId = input.businessLocationId;
  }

  if (input.pickupDate) {
    body.pickupDate = input.pickupDate;
  }

  try {
    // ?apiVersion=1 is required by Bosta docs
    const res = await fetch(`${baseUrl()}/deliveries?apiVersion=1`, {
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
    const trackingNumber: string = String(
      json.trackingNumber ?? json.Tracking_Number ?? "",
    );

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
 * Fetch a single Bosta shipment by its Bosta ID.
 * Useful for on-demand status checks without waiting for a webhook.
 */
export async function getShipment(bostaShipmentId: string): Promise<{
  data: Record<string, unknown> | null;
  error: string | null;
}> {
  try {
    const res = await fetch(`${baseUrl()}/deliveries/${bostaShipmentId}`, {
      method: "GET",
      headers: headers(),
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        data: null,
        error: json?.message ?? `Bosta API error ${res.status}`,
      };
    }
    return { data: json as Record<string, unknown>, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Register a vendor pickup address with Bosta.
 * Creates a new business location in the Bosta account.
 * Returns the Bosta `businessLocationId` to store on the vendor record.
 *
 * Docs: POST /pickup-locations
 */
export async function registerPickupAddress(input: {
  name: string; // e.g. business name
  address: BostaAddress;
  contactName: string;
  contactPhone: string;
}): Promise<
  { locationId: string; error: null } | { locationId: null; error: string }
> {
  try {
    const body = {
      locationName: input.name,
      address: formatAddress(input.address),
      contactPerson: {
        name: input.contactName,
        phone: input.contactPhone,
      },
    };

    const res = await fetch(`${baseUrl()}/pickup-locations`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        locationId: null,
        error: json?.message ?? json?.error ?? `Bosta API error ${res.status}`,
      };
    }

    // Bosta returns the location _id (e.g. "oHCWTITNBG")
    const locationId: string =
      json?.data?._id ?? json?.data?.id ?? json._id ?? json.id ?? json.locationId;
    if (!locationId) {
      return {
        locationId: null,
        error: "Bosta returned no location ID — check the Bosta dashboard.",
      };
    }

    return { locationId, error: null };
  } catch (err: unknown) {
    return {
      locationId: null,
      error:
        err instanceof Error ? err.message : "Network error contacting Bosta",
    };
  }
}

/**
 * Terminate (cancel) an existing Bosta shipment.
 * Only possible before the shipment is picked up.
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
 * Verify an incoming Bosta webhook request.
 * Configure a custom Authorization header value in the Bosta dashboard
 * and set BOSTA_WEBHOOK_SECRET to that same value.
 * Returns true when the header matches, or when no secret is configured.
 */
export function verifyWebhookSignature(
  authorizationHeader: string | null,
): boolean {
  const secret = process.env.BOSTA_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification if not configured
  if (!authorizationHeader) return false;
  return authorizationHeader === secret;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a Bosta address object.
 * Prefers districtId (most reliable).
 * Falls back to cityId + districtName when districtId is unavailable.
 * Minimum required: city name + firstLine (≥ 5 chars).
 */
function formatAddress(addr: BostaAddress): Record<string, unknown> {
  const out: Record<string, unknown> = {
    city: addr.city,
    firstLine: addr.firstLine,
  };

  if (addr.districtId) {
    out.districtId = addr.districtId;
  } else if (addr.districtName && addr.cityId) {
    out.cityId = addr.cityId;
    out.districtName = addr.districtName;
  }

  if (addr.zoneId) out.zoneId = addr.zoneId;
  if (addr.secondLine) out.secondLine = addr.secondLine;
  if (addr.buildingNumber) out.buildingNumber = addr.buildingNumber;
  if (addr.floor) out.floor = addr.floor;
  if (addr.apartment) out.apartment = addr.apartment;

  return out;
}
