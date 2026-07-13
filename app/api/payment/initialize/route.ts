import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, plan } = await request.json();

  const amounts: Record<string, number> = {
    professional: 1500000, // ₦15,000 in kobo
  };

  const amount = amounts[plan];
  if (!amount) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount,
        currency: "NGN",
        metadata: {
          plan,
          product: "NaijaClimaGuard",
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://naijaclimaguard.vercel.app"}/api/payment/verify`,
      }),
    });

    const data = await res.json();

    if (!data.status) {
      return NextResponse.json({ error: data.message || "Payment initialization failed" }, { status: 400 });
    }

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      access_code: data.data.access_code,
    });
  } catch (error) {
    console.error("Paystack error:", error);
    return NextResponse.json({ error: "Could not connect to payment service" }, { status: 500 });
  }
}
