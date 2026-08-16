import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { commercialProduct } from "@/lib/commercial-products";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in before checkout." }, { status: 401 });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}
  const product = commercialProduct(body.productCode || body.plan || "family_plus_annual");
  if (!product) return NextResponse.json({ error: "Unknown commercial product." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, email: true, plan: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (user.plan === "ENTERPRISE" && product.kind === "plan") {
    return NextResponse.json({ error: "Enterprise plans are contract-managed." }, { status: 409 });
  }
  if (!process.env.PAYSTACK_SECRET_KEY) return NextResponse.json({ error: "Payment service is not configured." }, { status: 503 });

  try {
    const order = await prisma.commercialOrder.create({
      data: {
        userId: user.id,
        productCode: product.code,
        amountKobo: product.amountKobo,
        currency: product.currency,
        creditsGranted: product.credits,
        metadata: { productName: product.name, kind: product.kind },
      },
      select: { id: true },
    });

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: product.amountKobo,
        currency: product.currency,
        metadata: {
          product: "NaijaClimaGuard",
          product_code: product.code,
          order_id: order.id,
          account_user_id: user.id,
          account_email: user.email.toLowerCase(),
          expected_amount_kobo: product.amountKobo,
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://naijaclimaguard.vercel.app"}/api/payment/verify`,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status || !data.data?.authorization_url || !data.data?.reference) {
      await prisma.commercialOrder.update({ where: { id: order.id }, data: { status: "INITIALIZE_FAILED" } });
      return NextResponse.json({ error: data.message || "Payment initialization failed" }, { status: 502 });
    }

    await prisma.commercialOrder.update({
      where: { id: order.id },
      data: { reference: data.data.reference, status: "AWAITING_PAYMENT" },
    });

    return NextResponse.json({ authorization_url: data.data.authorization_url, reference: data.data.reference, product: product.code });
  } catch (error) {
    console.error("Paystack initialization error:", error);
    return NextResponse.json({ error: "Could not connect to payment service" }, { status: 502 });
  }
}
