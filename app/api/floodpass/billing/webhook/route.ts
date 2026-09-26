import { NextResponse } from "next/server";
import { validPaystackSignature, PAYSTACK_WEBHOOK_IPS, type PaystackTransaction } from "@/lib/floodpass/billing/paystack";
import { applySubscriptionEvent, applySuccessfulPayment } from "@/lib/floodpass/billing/service";

export const dynamic = "force-dynamic";

/**
 * Paystack webhook. Set https://<site>/api/floodpass/billing/webhook in the
 * Paystack dashboard. Every call must carry a valid x-paystack-signature.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validPaystackSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  }
  // Extra lock when Vercel passes the caller's address: only Paystack's own servers.
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  if (ip && process.env.PAYSTACK_CHECK_IP === "true" && !PAYSTACK_WEBHOOK_IPS.includes(ip)) {
    return NextResponse.json({ error: "Unknown sender." }, { status: 403 });
  }
  let payload: { event?: string; data?: Record<string, unknown> };
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }
  const event = String(payload.event ?? "");
  try {
    if (event === "charge.success" && payload.data) await applySuccessfulPayment(payload.data as unknown as PaystackTransaction, event);
    else if (payload.data && ["subscription.create", "subscription.disable", "subscription.not_renew", "invoice.payment_failed"].includes(event)) {
      await applySubscriptionEvent(event, payload.data);
    }
  } catch (error) {
    console.error("paystack webhook failed", event, error);
    // A 500 makes Paystack retry later, which is what we want if the database blinked.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
