import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PROFESSIONAL_AMOUNT_KOBO = 1_500_000;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in before starting a paid plan." }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* plan defaults below */ }
  const plan = String(body.plan || "professional").toLowerCase();
  if (plan !== "professional") {
    return NextResponse.json({ error: "Only the Professional plan can be purchased online." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, email: true, plan: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (user.plan === "ENTERPRISE") {
    return NextResponse.json({ error: "Enterprise accounts are managed by contract and cannot be changed through public checkout." }, { status: 409 });
  }
  if (user.plan === "PROFESSIONAL") {
    return NextResponse.json({ error: "This account is already on the Professional plan." }, { status: 409 });
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json({ error: "Payment service is not configured." }, { status: 503 });
  }

  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: PROFESSIONAL_AMOUNT_KOBO,
        currency: "NGN",
        metadata: {
          plan: "professional",
          product: "NaijaClimaGuard",
          account_user_id: user.id,
          account_email: user.email.toLowerCase(),
          expected_amount_kobo: PROFESSIONAL_AMOUNT_KOBO,
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://naijaclimaguard.vercel.app"}/api/payment/verify`,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status || !data.data?.authorization_url || !data.data?.reference) {
      return NextResponse.json({ error: data.message || "Payment initialization failed" }, { status: 502 });
    }

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (error) {
    console.error("Paystack initialization error:", error);
    return NextResponse.json({ error: "Could not connect to payment service" }, { status: 502 });
  }
}
