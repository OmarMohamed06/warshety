/**
 * Paymob server-side utilities.
 * This file must NEVER be imported in client components — it uses Node.js crypto.
 */

import crypto from "crypto";

const BASE_URL = process.env.PAYMOB_BASE_URL ?? "https://accept.paymob.com";
const SECRET_KEY = process.env.PAYMOB_SECRET_KEY!;
const HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET!;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IntentionBillingData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  /** City (street-level address not required by Paymob but strongly recommended) */
  street?: string;
  city: string;
  country: string;
  state?: string;
  postal_code?: string;
}

export interface IntentionItem {
  name: string;
  amount: number; /** in cents (EGP × 100) */
  description?: string;
  quantity: number;
}

export interface CreateIntentionParams {
  /** Amount in **cents** (EGP × 100) */
  amountCents: number;
  currency?: string;
  /** Integration IDs from Paymob Dashboard */
  integrationIds: number[];
  billingData: IntentionBillingData;
  items: IntentionItem[];
  /**
   * Your internal reference — used by the webhook to identify the order.
   * Must be unique per order attempt.
   */
  specialReference: string;
  /** Full URL where Paymob POSTs transaction results */
  notificationUrl: string;
  /** Full URL Paymob redirects the user to after Unified Checkout */
  redirectionUrl: string;
}

export interface IntentionResponse {
  clientSecret: string;
  paymobOrderId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Paymob Payment Intention
// ─────────────────────────────────────────────────────────────────────────────

export async function createIntention(
  params: CreateIntentionParams,
): Promise<IntentionResponse> {
  const body = {
    amount: params.amountCents,
    currency: params.currency ?? "EGP",
    payment_methods: params.integrationIds,
    items: params.items.map((i) => ({
      name: i.name,
      amount: i.amount,
      description: i.description ?? i.name,
      quantity: i.quantity,
    })),
    billing_data: params.billingData,
    customer: {
      first_name: params.billingData.first_name,
      last_name: params.billingData.last_name,
      email: params.billingData.email,
    },
    special_reference: params.specialReference,
    notification_url: params.notificationUrl,
    redirection_url: params.redirectionUrl,
  };

  const response = await fetch(`${BASE_URL}/v1/intention/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${SECRET_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Paymob intention failed (${response.status}): ${text}`);
  }

  const json = await response.json();

  return {
    clientSecret: json.client_secret as string,
    paymobOrderId: String(json.id),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HMAC verification for Paymob webhooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The 20 fields Paymob concatenates (lexicographic order) to build the HMAC string.
 * Reference: https://developers.paymob.com/egypt/docs/transaction-webhooks
 */
const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = obj;
  for (const part of parts) {
    if (current == null) return "";
    current = current[part];
  }
  if (current == null) return "";
  return String(current);
}

/**
 * Verifies the HMAC sent by Paymob in the `hmac` query parameter.
 * Returns true if the computed HMAC matches the received one.
 */
export function verifyHmac(
  transactionData: Record<string, unknown>,
  receivedHmac: string,
): boolean {
  const concatenated = HMAC_FIELDS.map((field) =>
    getNestedValue(transactionData, field),
  ).join("");

  const computed = crypto
    .createHmac("sha512", HMAC_SECRET)
    .update(concatenated)
    .digest("hex");

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(receivedHmac, "hex"),
    );
  } catch {
    return false;
  }
}
