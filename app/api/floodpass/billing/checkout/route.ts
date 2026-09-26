import { NextResponse } from "next/server";
import { CheckoutError, startCheckout } from "@/lib/floodpass/billing/service";
import { isStorageNotReady } from "@/lib/floodpass/service";

export const dynamic = "force-dynamic";

/** POST { plan, email, phone, addressCheckCode? } → { url } of the Paystack payment page. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await startCheckout({
      plan: String(body.plan ?? ""),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
      addressCheckCode: typeof body.addressCheckCode === "string" ? body.addressCheckCode : null,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (isStorageNotReady(error)) return NextResponse.json({ error: "FloodPass storage is not switched on yet." }, { status: 503 });
    console.error("checkout failed", error);
    return NextResponse.json({ error: "We could not start the payment. Please try again." }, { status: 502 });
  }
}
