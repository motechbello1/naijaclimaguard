import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { commercialProduct } from "@/lib/commercial-products";

function commercial(baseUrl: string, params: string) {
  return NextResponse.redirect(new URL(`/commercial?${params}`, baseUrl));
}

async function markFailed(reference: string, reason: string) {
  if (!reference) return;
  try {
    await prisma.commercialOrder.updateMany({
      where: { reference, status: { not: "PAID" } },
      data: { status: "FAILED", metadata: { verificationFailure: reason } },
    });
  } catch (error) {
    console.error("Could not mark commercial order failed", error);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("reference") || searchParams.get("trxref") || "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://naijaclimaguard.vercel.app";

  if (!ref) return commercial(baseUrl, "payment=failed&reason=no_reference");
  if (!process.env.PAYSTACK_SECRET_KEY) return commercial(baseUrl, "payment=failed&reason=payment_not_configured");

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: "no-store",
    });
    const payload = await res.json();
    const tx = payload?.data;
    if (!res.ok || !payload?.status || tx?.status !== "success") {
      await markFailed(ref, String(tx?.status || payload?.message || "not_successful").slice(0, 120));
      return commercial(baseUrl, "payment=failed&reason=not_successful");
    }

    const metadata = tx.metadata || {};
    const product = commercialProduct(metadata.product_code);
    const customerEmail = String(tx.customer?.email || "").toLowerCase();
    const expectedEmail = String(metadata.account_email || "").toLowerCase();
    const accountUserId = String(metadata.account_user_id || "");
    const orderId = String(metadata.order_id || "");

    if (!product || metadata.product !== "NaijaClimaGuard" || Number(tx.amount) !== product.amountKobo || String(tx.currency || "").toUpperCase() !== product.currency || !accountUserId || !orderId || customerEmail !== expectedEmail) {
      await markFailed(ref, "entitlement_mismatch");
      return commercial(baseUrl, "payment=failed&reason=entitlement_mismatch");
    }

    const order = await prisma.commercialOrder.findFirst({ where: { id: orderId, userId: accountUserId, productCode: product.code } });
    if (!order) {
      await markFailed(ref, "order_mismatch");
      return commercial(baseUrl, "payment=failed&reason=order_mismatch");
    }
    if (order.status === "PAID") return commercial(baseUrl, `payment=success&product=${product.code}`);

    await prisma.$transaction(async (db) => {
      await db.commercialOrder.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date(), reference: ref } });

      if (product.kind === "credits") {
        await db.apiCreditWallet.upsert({
          where: { userId: accountUserId },
          create: { userId: accountUserId, balance: product.credits, purchased: product.credits },
          update: { balance: { increment: product.credits }, purchased: { increment: product.credits } },
        });
      } else if (product.plan) {
        await db.user.update({ where: { id: accountUserId }, data: { plan: product.plan } });
        if (product.plan === "BUSINESS_STARTER") {
          const existing = await db.organizationWorkspace.findFirst({ where: { ownerUserId: accountUserId, status: "ACTIVE" } });
          if (!existing) {
            await db.organizationWorkspace.create({
              data: { ownerUserId: accountUserId, name: "My organisation", organizationType: "business", plan: "BUSINESS_STARTER", seatLimit: 5, locationLimit: 25 },
            });
          }
        }
      }
    });

    if (PLAN_PRODUCTS_FOR_ENTITLEMENT.has(product.code)) {
      const entitlementUntil = new Date(Date.now() + 365 * 86400_000);
      await prisma.$executeRaw`UPDATE "CommercialOrder" SET "entitlementUntil" = ${entitlementUntil} WHERE id = ${order.id}`;
    }

    return commercial(baseUrl, `payment=success&product=${product.code}`);
  } catch (error) {
    console.error("Payment verification error:", error);
    await markFailed(ref, "verification_error");
    return commercial(baseUrl, "payment=failed&reason=verification_error");
  }
}

const PLAN_PRODUCTS_FOR_ENTITLEMENT = new Set(["family_plus_annual", "business_starter_annual"]);
