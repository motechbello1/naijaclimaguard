import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { planByCode, PLANS, type Plan } from "@/lib/floodpass/billing/plans";
import { initializeTransaction, paystackConfigured, readMetadata, verifyTransaction, type PaystackTransaction } from "@/lib/floodpass/billing/paystack";
import { normalizePhone } from "@/lib/floodpass/channels/phone";
import { completeAddressCheck } from "@/lib/floodpass/address-check";

export class CheckoutError extends Error {}

function baseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://naijaclimaguard.vercel.app").replace(/\/+$/, "");
}

export function paystackPlanCode(plan: Plan) {
  return plan.paystackPlanEnv ? process.env[plan.paystackPlanEnv]?.trim() || null : null;
}

/** Which of our plans a Paystack plan code belongs to. */
export function planForPaystackCode(code: string | null | undefined) {
  if (!code) return null;
  return PLANS.find((plan) => paystackPlanCode(plan) === code) ?? null;
}

/** Starts a payment and returns the Paystack page to send the person to. */
export async function startCheckout(input: { plan: string; email: string; phone: string; addressCheckCode?: string | null }) {
  const plan = planByCode(input.plan);
  if (!plan || plan.status !== "live" || plan.amountKobo <= 0) throw new CheckoutError("That plan cannot be bought yet.");
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new CheckoutError("Please give a real email address; Paystack sends the receipt there.");
  const phone = normalizePhone(input.phone);
  if (!phone) throw new CheckoutError("Please give your phone number, for example 08031234567.");
  if (!paystackConfigured()) throw new CheckoutError("Payments are not switched on yet. Join the waiting list and we will tell you.");

  const reference = `fp_${plan.code}_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
  if (plan.family === "ADDRESS") {
    if (!input.addressCheckCode) throw new CheckoutError("Pick the address first.");
    const check = await prisma.addressCheck.findUnique({ where: { code: input.addressCheckCode } });
    if (!check) throw new CheckoutError("That address check was not found.");
    if (check.status === "PAID") throw new CheckoutError("This address check is already paid.");
    await prisma.addressCheck.update({ where: { id: check.id }, data: { reference, email } });
  } else {
    await prisma.floodPassSubscription.create({ data: { plan: plan.code, email, phone, amountKobo: plan.amountKobo, reference } });
  }

  const planCode = paystackPlanCode(plan);
  const page = await initializeTransaction({
    email,
    amountKobo: plan.amountKobo,
    reference,
    callbackUrl: `${baseUrl()}/floodpass/plans/done`,
    metadata: { floodpass_plan: plan.code, phone, address_check: input.addressCheckCode ?? null },
    planCode,
  });
  return { url: page.authorization_url, reference };
}

function extend(from: Date | null, days: number) {
  const start = from && from.getTime() > Date.now() ? from : new Date();
  return new Date(start.getTime() + days * 86_400_000);
}

/**
 * Records a successful payment and switches the plan on. Safe to call many
 * times for the same payment (webhook and the return page both call it).
 */
export async function applySuccessfulPayment(tx: PaystackTransaction, event: string) {
  if (tx.status !== "success") return { ok: false, reason: `payment ${tx.status}` };
  const meta = readMetadata(tx.metadata);
  const paystackPlan = typeof tx.plan === "object" && tx.plan ? tx.plan.plan_code : typeof tx.plan === "string" ? tx.plan : null;
  const plan = planByCode(meta.floodpass_plan) ?? planForPaystackCode(paystackPlan);
  if (!plan) return { ok: false, reason: "unknown plan" };
  if (tx.currency !== "NGN" || tx.amount < plan.amountKobo) return { ok: false, reason: "amount or currency does not match the plan" };

  const first = await prisma.floodPassPayment
    .create({
      data: {
        reference: tx.reference,
        plan: plan.code,
        amountKobo: tx.amount,
        currency: tx.currency,
        status: tx.status,
        email: tx.customer?.email ?? null,
        phone: typeof meta.phone === "string" ? meta.phone : null,
        event,
        raw: JSON.parse(JSON.stringify(tx)) as Prisma.InputJsonValue,
      },
    })
    .then(() => true, (error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    });

  if (plan.family === "ADDRESS") {
    const code = typeof meta.address_check === "string" ? meta.address_check : null;
    const check = code
      ? await prisma.addressCheck.findUnique({ where: { code } })
      : await prisma.addressCheck.findUnique({ where: { reference: tx.reference } });
    if (check && check.status !== "PAID") await completeAddressCheck(check.id, tx.reference);
    return { ok: true, plan: plan.code, addressCheck: check?.code ?? null, duplicate: !first };
  }
  if (!first) return { ok: true, plan: plan.code, duplicate: true };

  // A first payment carries our reference; a monthly renewal has a new one, so match by email and plan.
  const subscription =
    (await prisma.floodPassSubscription.findUnique({ where: { reference: tx.reference } })) ??
    (tx.customer?.email
      ? await prisma.floodPassSubscription.findFirst({ where: { email: tx.customer.email.toLowerCase(), plan: plan.code, status: { in: ["ACTIVE", "PAST_DUE", "PENDING"] } }, orderBy: { createdAt: "desc" } })
      : null);
  if (!subscription) return { ok: false, reason: "no matching subscription" };
  await prisma.floodPassSubscription.update({
    where: { id: subscription.id },
    data: {
      status: "ACTIVE",
      currentPeriodEnd: extend(subscription.currentPeriodEnd, plan.periodDays),
      paystackCustomerCode: tx.customer?.customer_code ?? subscription.paystackCustomerCode,
    },
  });
  return { ok: true, plan: plan.code, subscription: subscription.id };
}

/** The return page: check the payment with Paystack ourselves (never trust the browser). */
export async function confirmByReference(reference: string) {
  if (!paystackConfigured()) return { ok: false, reason: "payments off" };
  const tx = await verifyTransaction(reference);
  return applySuccessfulPayment(tx, "verify");
}

/** Webhook events about repeating plans. */
export async function applySubscriptionEvent(event: string, data: Record<string, unknown>) {
  const email = String((data.customer as { email?: string } | undefined)?.email ?? "").toLowerCase();
  const planCode = String((data.plan as { plan_code?: string } | undefined)?.plan_code ?? "");
  const plan = planForPaystackCode(planCode);
  if (!email || !plan) return { ok: false };
  const subscription = await prisma.floodPassSubscription.findFirst({ where: { email, plan: plan.code }, orderBy: { createdAt: "desc" } });
  if (!subscription) return { ok: false };
  if (event === "subscription.create") {
    await prisma.floodPassSubscription.update({
      where: { id: subscription.id },
      data: { paystackSubscription: String(data.subscription_code ?? "") || null, paystackEmailToken: String(data.email_token ?? "") || null },
    });
  } else if (event === "subscription.disable" || event === "subscription.not_renew") {
    // Keep what they paid for until the period ends; the scheduled job ends it after that.
    await prisma.floodPassSubscription.update({ where: { id: subscription.id }, data: { cancelledAt: new Date() } });
  } else if (event === "invoice.payment_failed") {
    await prisma.floodPassSubscription.update({ where: { id: subscription.id }, data: { status: "PAST_DUE" } });
  }
  return { ok: true };
}
