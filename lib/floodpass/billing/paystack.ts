import { createHmac, timingSafeEqual } from "crypto";

/**
 * Paystack (cards, bank transfer, USSD and more, in naira).
 *
 * Settings:
 *   PAYSTACK_SECRET_KEY            sk_live_... or sk_test_...
 *   PAYSTACK_PLAN_FAMILY_MONTHLY   PLN_... (optional; makes Family Plus renew by itself)
 *   PAYSTACK_PLAN_FAMILY_WEEKLY    PLN_...
 *   PAYSTACK_PLAN_DIASPORA_MONTHLY PLN_...
 * Without plan codes, a plan is a one-off payment for one period.
 * Without the secret key, checkout says payments are not switched on yet.
 */

const BASE = "https://api.paystack.co";

/** Paystack only sends webhooks from these addresses. */
export const PAYSTACK_WEBHOOK_IPS = ["52.31.139.75", "52.49.173.169", "52.214.14.220"];

export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

function headers() {
  return { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!.trim()}`, "Content-Type": "application/json" };
}

type PaystackResponse<T> = { status: boolean; message: string; data: T };

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<PaystackResponse<T>> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12000),
  });
  const json = (await response.json().catch(() => ({ status: false, message: `Paystack ${response.status}` }))) as PaystackResponse<T>;
  if (!response.ok || !json.status) throw new Error(json.message || `Paystack ${response.status}`);
  return json;
}

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
  planCode?: string | null;
}) {
  const body: Record<string, unknown> = {
    email: input.email,
    amount: String(input.amountKobo),
    currency: "NGN",
    reference: input.reference,
    callback_url: input.callbackUrl,
    metadata: JSON.stringify(input.metadata),
    channels: ["card", "bank", "ussd", "bank_transfer", "qr"],
  };
  if (input.planCode) body.plan = input.planCode;
  const result = await call<{ authorization_url: string; access_code: string; reference: string }>("POST", "/transaction/initialize", body);
  return result.data;
}

export type PaystackTransaction = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string | null;
  metadata?: unknown;
  customer?: { email?: string; customer_code?: string };
  plan?: { plan_code?: string } | string | null;
};

export async function verifyTransaction(reference: string) {
  const result = await call<PaystackTransaction>("GET", `/transaction/verify/${encodeURIComponent(reference)}`);
  return result.data;
}

export async function createPlan(input: { name: string; amountKobo: number; interval: "weekly" | "monthly"; description: string }) {
  const result = await call<{ plan_code: string; name: string }>("POST", "/plan", {
    name: input.name,
    amount: String(input.amountKobo),
    interval: input.interval,
    currency: "NGN",
    description: input.description,
    send_invoices: true,
    send_sms: true,
  });
  return result.data;
}

/** x-paystack-signature is an HMAC-SHA512 of the raw body, keyed with the secret key. */
export function validPaystackSignature(rawBody: string, signature: string | null, secret = process.env.PAYSTACK_SECRET_KEY?.trim()) {
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}

/** Paystack sends metadata back as an object or a JSON string. */
export function readMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return {};
}
