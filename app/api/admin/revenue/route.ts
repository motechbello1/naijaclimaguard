import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isRevenueAdminEmail } from "@/lib/revenue-admin";

export const dynamic = "force-dynamic";

const PLAN_PRODUCTS = new Set(["family_plus_annual", "business_starter_annual"]);
const API_PRODUCTS = new Set(["api_10000", "api_100000"]);
const LEAD_STAGES = new Set(["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST", "ON_HOLD"]);

type LeadRow = {
  id: string;
  name: string;
  email: string;
  organization: string;
  organizationType: string;
  objective: string;
  stage: string;
  source: string;
  estimatedValueNgn: number | null;
  nextAction: string | null;
  nextActionAt: Date | null;
  lostReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

async function authorised() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  return { session, ok: Boolean(email && isRevenueAdminEmail(email)) };
}

function ngnFromKobo(value: number) {
  return Math.round(value / 100);
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const access = await authorised();
  if (!access.session?.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!access.ok) return NextResponse.json({ error: "Founder Revenue access is restricted." }, { status: 403 });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000);
  const yearAgo = new Date(now.getTime() - 365 * 86400_000);
  const abandonedBefore = new Date(now.getTime() - 30 * 60_000);

  const [orders, leads, wallets, workspaces, usersByPlan] = await Promise.all([
    prisma.commercialOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, name: true, plan: true } } },
    }),
    prisma.$queryRaw<LeadRow[]>`
      SELECT id, name, email, organization, "organizationType", objective, stage, source,
             "estimatedValueNgn", "nextAction", "nextActionAt", "lostReason", "createdAt", "updatedAt"
      FROM "InstitutionalLead"
      ORDER BY "createdAt" DESC
    `,
    prisma.apiCreditWallet.aggregate({ _sum: { balance: true, purchased: true, used: true }, _count: true }),
    prisma.organizationWorkspace.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, plan: true, seatLimit: true, locationLimit: true, createdAt: true } }),
    prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
  ]);

  const paid = orders.filter((order) => order.status === "PAID" && order.paidAt);
  const paid30 = paid.filter((order) => order.paidAt! >= thirtyDaysAgo);
  const cashCollected = paid.reduce((sum, order) => sum + order.amountKobo, 0);
  const cash30 = paid30.reduce((sum, order) => sum + order.amountKobo, 0);
  const apiRevenue = paid.filter((order) => API_PRODUCTS.has(order.productCode)).reduce((sum, order) => sum + order.amountKobo, 0);
  const planRevenue = paid.filter((order) => PLAN_PRODUCTS.has(order.productCode)).reduce((sum, order) => sum + order.amountKobo, 0);
  const abandoned = orders.filter((order) => order.status !== "PAID" && order.createdAt < abandonedBefore);
  const failed = orders.filter((order) => order.status === "FAILED");

  // Annual run-rate is based only on the latest active paid annual plan per customer.
  // Prepaid API packs and open enterprise pipeline never count as recurring revenue.
  const activePlanOrders = paid
    .filter((order) => PLAN_PRODUCTS.has(order.productCode) && order.paidAt! >= yearAgo)
    .sort((a, b) => b.paidAt!.getTime() - a.paidAt!.getTime());
  const latestPlanByUser = new Map<string, typeof activePlanOrders[number]>();
  for (const order of activePlanOrders) if (!latestPlanByUser.has(order.userId)) latestPlanByUser.set(order.userId, order);
  const arrKobo = Array.from(latestPlanByUser.values()).reduce((sum, order) => sum + order.amountKobo, 0);

  const productMap = new Map<string, { productCode: string; orders: number; revenueNgn: number }>();
  for (const order of paid) {
    const current = productMap.get(order.productCode) || { productCode: order.productCode, orders: 0, revenueNgn: 0 };
    current.orders += 1;
    current.revenueNgn += ngnFromKobo(order.amountKobo);
    productMap.set(order.productCode, current);
  }

  const daily = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
    daily.set(dayKey(d), 0);
  }
  for (const order of paid30) {
    const key = dayKey(order.paidAt!);
    if (daily.has(key)) daily.set(key, (daily.get(key) || 0) + ngnFromKobo(order.amountKobo));
  }

  const renewals = Array.from(latestPlanByUser.values())
    .map((order) => ({
      orderId: order.id,
      customer: order.user.name || order.user.email,
      email: order.user.email,
      productCode: order.productCode,
      amountNgn: ngnFromKobo(order.amountKobo),
      dueAt: new Date(order.paidAt!.getTime() + 365 * 86400_000),
    }))
    .filter((item) => item.dueAt >= now)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 20);

  const openLeads = leads.filter((lead) => !["CLOSED_WON", "CLOSED_LOST"].includes(lead.stage));
  const pipelineValue = openLeads.reduce((sum, lead) => sum + (lead.estimatedValueNgn || 0), 0);
  const wonValue = leads.filter((lead) => lead.stage === "CLOSED_WON").reduce((sum, lead) => sum + (lead.estimatedValueNgn || 0), 0);
  const overdueFollowUps = openLeads.filter((lead) => lead.nextActionAt && lead.nextActionAt < now).length;
  const leadStages = Array.from(LEAD_STAGES).map((stage) => ({
    stage,
    count: leads.filter((lead) => lead.stage === stage).length,
    valueNgn: leads.filter((lead) => lead.stage === stage).reduce((sum, lead) => sum + (lead.estimatedValueNgn || 0), 0),
  }));

  const paidUsers = new Set(paid.map((order) => order.userId));
  const conversion = orders.length ? (paid.length / orders.length) * 100 : 0;

  return NextResponse.json({
    generatedAt: now.toISOString(),
    metrics: {
      cashCollectedNgn: ngnFromKobo(cashCollected),
      cash30Ngn: ngnFromKobo(cash30),
      arrRunRateNgn: ngnFromKobo(arrKobo),
      mrrEquivalentNgn: Math.round(ngnFromKobo(arrKobo) / 12),
      apiRevenueNgn: ngnFromKobo(apiRevenue),
      planRevenueNgn: ngnFromKobo(planRevenue),
      paidCustomers: paidUsers.size,
      paidOrders: paid.length,
      checkoutAttempts: orders.length,
      checkoutConversionPct: Number(conversion.toFixed(1)),
      abandonedCheckouts: abandoned.length,
      failedCheckouts: failed.length,
      activeWorkspaces: workspaces.length,
      apiWallets: wallets._count,
      apiCreditsOutstanding: wallets._sum.balance || 0,
      apiCreditsPurchased: wallets._sum.purchased || 0,
      apiCreditsUsed: wallets._sum.used || 0,
      openPipelineNgn: pipelineValue,
      wonPipelineNgn: wonValue,
      openLeads: openLeads.length,
      overdueFollowUps,
    },
    revenueTrend30d: Array.from(daily.entries()).map(([date, revenueNgn]) => ({ date, revenueNgn })),
    productBreakdown: Array.from(productMap.values()).sort((a, b) => b.revenueNgn - a.revenueNgn),
    planMix: usersByPlan.map((row) => ({ plan: row.plan, users: row._count._all })),
    leadStages,
    renewals,
    workspaces,
    leads: leads.slice(0, 50).map((lead) => ({ ...lead, estimatedValueNgn: lead.estimatedValueNgn || 0 })),
    recentOrders: orders.slice(0, 30).map((order) => ({
      id: order.id,
      customer: order.user.name || order.user.email,
      email: order.user.email,
      productCode: order.productCode,
      amountNgn: ngnFromKobo(order.amountKobo),
      status: order.status,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const access = await authorised();
  if (!access.session?.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!access.ok) return NextResponse.json({ error: "Founder Revenue access is restricted." }, { status: 403 });

  const body = await request.json();
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "Lead id is required." }, { status: 400 });

  const rows = await prisma.$queryRaw<LeadRow[]>`
    SELECT id, name, email, organization, "organizationType", objective, stage, source,
           "estimatedValueNgn", "nextAction", "nextActionAt", "lostReason", "createdAt", "updatedAt"
    FROM "InstitutionalLead" WHERE id = ${id} LIMIT 1
  `;
  const current = rows[0];
  if (!current) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  const stage = String(body.stage ?? current.stage).toUpperCase();
  if (!LEAD_STAGES.has(stage)) return NextResponse.json({ error: "Invalid pipeline stage." }, { status: 400 });

  const rawValue = body.estimatedValueNgn ?? current.estimatedValueNgn ?? null;
  const estimatedValueNgn = rawValue === null || rawValue === "" ? null : Math.max(0, Math.round(Number(rawValue)));
  if (estimatedValueNgn !== null && (!Number.isFinite(estimatedValueNgn) || estimatedValueNgn > 2_000_000_000)) {
    return NextResponse.json({ error: "Estimated value is outside the supported range." }, { status: 400 });
  }

  const nextAction = String(body.nextAction ?? current.nextAction ?? "").trim().slice(0, 500) || null;
  const lostReason = String(body.lostReason ?? current.lostReason ?? "").trim().slice(0, 500) || null;
  let nextActionAt: Date | null = current.nextActionAt;
  if (body.nextActionAt === "" || body.nextActionAt === null) nextActionAt = null;
  else if (body.nextActionAt !== undefined) {
    const parsed = new Date(String(body.nextActionAt));
    if (Number.isNaN(parsed.getTime())) return NextResponse.json({ error: "Invalid follow-up date." }, { status: 400 });
    nextActionAt = parsed;
  }

  await prisma.$executeRaw`
    UPDATE "InstitutionalLead"
    SET stage = ${stage},
        "estimatedValueNgn" = ${estimatedValueNgn},
        "nextAction" = ${nextAction},
        "nextActionAt" = ${nextActionAt},
        "lostReason" = ${lostReason},
        "updatedAt" = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}
