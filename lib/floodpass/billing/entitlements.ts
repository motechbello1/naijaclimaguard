import { prisma } from "@/lib/db";
import { FREE_ENTITLEMENTS, mergeEntitlements, planByCode, type Entitlements, type PlanFamily } from "@/lib/floodpass/billing/plans";

/** What extras a phone number has paid for, right now. */
export async function entitlementsForPhone(phone: string | null | undefined): Promise<Entitlements> {
  if (!phone) return FREE_ENTITLEMENTS;
  const rows = await prisma.floodPassSubscription.findMany({
    where: { phone, status: "ACTIVE", currentPeriodEnd: { gt: new Date() } },
    select: { plan: true },
  });
  const families = rows.map((row) => planByCode(row.plan)?.family).filter((family): family is PlanFamily => Boolean(family));
  return families.length ? mergeEntitlements(families) : FREE_ENTITLEMENTS;
}
