import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");
  const trxref = searchParams.get("trxref");

  const ref = reference || trxref;

  if (!ref) {
    return NextResponse.redirect(new URL("/dashboard?payment=failed&reason=no_reference", request.url));
  }

  try {
    // Verify the transaction with Paystack
    const res = await fetch(`https://api.paystack.co/transaction/verify/${ref}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await res.json();

    if (data.status && data.data.status === "success") {
      const email = data.data.customer.email;
      const plan = data.data.metadata?.plan || "professional";

      // Upgrade user plan in database
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: plan === "professional" ? "PROFESSIONAL" : "ENTERPRISE" },
        });
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://naijaclimaguard.vercel.app";
      return NextResponse.redirect(new URL(`/dashboard?payment=success&plan=${plan}`, baseUrl));
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://naijaclimaguard.vercel.app";
      return NextResponse.redirect(new URL("/dashboard?payment=failed&reason=not_successful", baseUrl));
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://naijaclimaguard.vercel.app";
    return NextResponse.redirect(new URL("/dashboard?payment=failed&reason=verification_error", baseUrl));
  }
}
