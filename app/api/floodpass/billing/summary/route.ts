import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isFounderRequest } from "@/lib/floodpass/founder-guard";
import { paystackConfigured } from "@/lib/floodpass/billing/paystack";
import { isStorageNotReady } from "@/lib/floodpass/service";

export const dynamic = "force-dynamic";

/** Founder only. Money at a glance: active plans, income in 30 days, waiting lists, partner checks. */
export async function GET() {
  if (!(await isFounderRequest())) return NextResponse.json({ error: "Founder only." }, { status: 403 });
  try {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [plans, payments, waitlist, checks, addressChecks] = await Promise.all([
      prisma.floodPassSubscription.groupBy({ by: ["plan", "status"], _count: { _all: true } }),
      prisma.floodPassPayment.aggregate({ where: { createdAt: { gte: since }, status: "success" }, _sum: { amountKobo: true }, _count: { _all: true } }),
      prisma.floodPassWaitlist.groupBy({ by: ["plan"], _count: { _all: true } }),
      prisma.passCheck.count({ where: { billable: true, createdAt: { gte: since } } }),
      prisma.addressCheck.count({ where: { status: "PAID" } }),
    ]);
    return NextResponse.json({
      paymentsOn: paystackConfigured(),
      plans: plans.map((p) => ({ plan: p.plan, status: p.status, count: p._count._all })),
      income30dNaira: Math.round((payments._sum.amountKobo ?? 0) / 100),
      payments30d: payments._count._all,
      waitlist: waitlist.map((w) => ({ plan: w.plan, count: w._count._all })),
      billablePartnerChecks30d: checks,
      paidAddressChecks: addressChecks,
    });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ error: "FloodPass storage is not switched on yet." }, { status: 503 });
    throw error;
  }
}
