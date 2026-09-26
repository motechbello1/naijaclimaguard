import { NextResponse } from "next/server";
import { getPublicPass } from "@/lib/floodpass/service";
import { looksLikePassCode, normalizePassCode } from "@/lib/floodpass/ledger";
import { appleWalletConfigured, pkpassFromSettings } from "@/lib/floodpass/wallet/apple";
import { publicBaseUrl } from "@/lib/floodpass/conversation-runner";

export const dynamic = "force-dynamic";

/** Downloads this FloodPass as an Apple Wallet pass (.pkpass). */
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  if (!appleWalletConfigured()) return NextResponse.json({ error: "Apple Wallet is not switched on yet." }, { status: 404 });
  const code = normalizePassCode(decodeURIComponent(params.code));
  if (!looksLikePassCode(code)) return NextResponse.json({ error: "Not a FloodPass code." }, { status: 400 });
  const pass = await getPublicPass(code).catch(() => null);
  if (!pass) return NextResponse.json({ error: "No such FloodPass." }, { status: 404 });
  try {
    const file = pkpassFromSettings(pass, `${publicBaseUrl()}/check?code=${encodeURIComponent(code)}`);
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="FloodPass-${code}.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("apple pass failed", error);
    return NextResponse.json({ error: "The Apple Wallet pass could not be made. Check the Apple certificate settings." }, { status: 500 });
  }
}
