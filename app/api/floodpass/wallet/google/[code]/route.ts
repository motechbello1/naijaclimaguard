import { NextResponse } from "next/server";
import { getPublicPass } from "@/lib/floodpass/service";
import { looksLikePassCode, normalizePassCode } from "@/lib/floodpass/ledger";
import { googleSaveUrl, googleWalletConfigured } from "@/lib/floodpass/wallet/google";
import { publicBaseUrl } from "@/lib/floodpass/conversation-runner";

export const dynamic = "force-dynamic";

/** Sends the person to "Save to Google Wallet" for this FloodPass. */
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  if (!googleWalletConfigured()) return NextResponse.json({ error: "Google Wallet is not switched on yet." }, { status: 404 });
  const code = normalizePassCode(decodeURIComponent(params.code));
  if (!looksLikePassCode(code)) return NextResponse.json({ error: "Not a FloodPass code." }, { status: 400 });
  const pass = await getPublicPass(code).catch(() => null);
  if (!pass) return NextResponse.json({ error: "No such FloodPass." }, { status: 404 });
  const base = publicBaseUrl();
  const url = await googleSaveUrl(pass, `${base}/check?code=${encodeURIComponent(code)}`, base);
  return NextResponse.redirect(url, 302);
}
