import { NextResponse } from "next/server";
import { isFounderRequest } from "@/lib/floodpass/founder-guard";
import { createPlan, paystackConfigured } from "@/lib/floodpass/billing/paystack";
import { PLANS } from "@/lib/floodpass/billing/plans";
import { paystackPlanCode } from "@/lib/floodpass/billing/service";

export const dynamic = "force-dynamic";

/**
 * Founder only. Creates the repeating plans on Paystack and shows the PLN_ codes
 * to paste into the Vercel settings (so Family Plus renews by itself).
 * Plans that already have a code are skipped.
 */
export async function POST() {
  if (!(await isFounderRequest())) return NextResponse.json({ error: "Founder only." }, { status: 403 });
  if (!paystackConfigured()) return NextResponse.json({ error: "Add PAYSTACK_SECRET_KEY first." }, { status: 400 });
  const out: Array<{ plan: string; setting: string; code: string; created: boolean }> = [];
  for (const plan of PLANS) {
    if (!plan.interval || !plan.paystackPlanEnv || plan.status !== "live") continue;
    const existing = paystackPlanCode(plan);
    if (existing) { out.push({ plan: plan.code, setting: plan.paystackPlanEnv, code: existing, created: false }); continue; }
    const made = await createPlan({ name: `FloodPass ${plan.name}`, amountKobo: plan.amountKobo, interval: plan.interval, description: plan.gets.join("; ") });
    out.push({ plan: plan.code, setting: plan.paystackPlanEnv, code: made.plan_code, created: true });
  }
  return NextResponse.json({ plans: out, next: "Add each setting to Vercel with its code, then redeploy." });
}
