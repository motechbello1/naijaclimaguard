import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PROFESSIONAL_AMOUNT_KOBO = 1_500_000;
const PRODUCT = "NaijaClimaGuard";

function dashboard(baseUrl: string, params: string) {
  return NextResponse.redirect(new URL(`/dashboard?${params}`, baseUrl));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("reference") || searchParams.get("trxref");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://naijaclimaguard.vercel.app";

  if (!ref) return dashboard(baseUrl, "payment=failed&reason=no_reference");
  if (!process.env.PAYSTACK_SECRET_KEY) return dashboard(baseUrl, "payment=failed&reason=payment_not_configured");

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: "no-store",
    });
    const payload = await res.json();
    const tx = payload?.data;

    if (!res.ok || !payload?.status || tx?.status !== "success") {
      return dashboard(baseUrl, "payment=failed&reason=not_successful");
    }

    const metadata = tx.metadata || {};
    const customerEmail = String(tx.customer?.email || "").toLowerCase();
    const expectedEmail = String(metadata.account_email || "").toLowerCase();
    const accountUserId = String(metadata.account_user_id || "");

    const validEntitlement =
      metadata.product === PRODUCT &&
      metadata.plan === "professional" &&
      Number(metadata.expected_amount_kobo) === PROFESSIONAL_AMOUNT_KOBO &&
      Number(tx.amount) === PROFESSIONAL_AMOUNT_KOBO &&
      String(tx.currency || "").toUpperCase() === "NGN" &&
      Boolean(accountUserId) &&
      Boolean(expectedEmail) &&
      customerEmail === expectedEmail;

    if (!validEntitlement) {
      console.error("Rejected Paystack entitlement mismatch", {
        reference: ref,
        product: metadata.product,
        plan: metadata.plan,
        amount: tx.amount,
        currency: tx.currency,
      });
      return dashboard(baseUrl, "payment=failed&reason=entitlement_mismatch");
    }

    const user = await prisma.user.findFirst({
      where: { id: accountUserId, email: expectedEmail },
      select: { id: true, plan: true },
    });
    if (!user) return dashboard(baseUrl, "payment=failed&reason=account_mismatch");
    if (user.plan === "ENTERPRISE") return dashboard(baseUrl, "payment=failed&reason=enterprise_contract_managed");

    // Public checkout can grant PROFESSIONAL only. There is no Enterprise path here.
    if (user.plan !== "PROFESSIONAL") {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: "PROFESSIONAL" },
      });
    }

    return dashboard(baseUrl, "payment=success&plan=professional");
  } catch (error) {
    console.error("Payment verification error:", error);
    return dashboard(baseUrl, "payment=failed&reason=verification_error");
  }
}
