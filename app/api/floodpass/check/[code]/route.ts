import { NextResponse } from "next/server";
import { checkPass, isStorageNotReady } from "@/lib/floodpass/service";
import { looksLikePassCode, normalizePassCode } from "@/lib/floodpass/ledger";

export const dynamic = "force-dynamic";

/**
 * GET /api/floodpass/check/FP-ABJ-7K2Q
 * Anyone: place, date, depth and "Verified".
 * Partners (header x-floodpass-key): full detail, and the check is logged for billing.
 */
export async function GET(req: Request, { params }: { params: { code: string } }) {
  const code = normalizePassCode(decodeURIComponent(params.code));
  if (!looksLikePassCode(code)) {
    return NextResponse.json({ found: false, code, error: "That does not look like a FloodPass code. Codes look like FP-ABJ-7K2Q." }, { status: 400 });
  }
  try {
    const outcome = await checkPass(code, req.headers.get("x-floodpass-key"));
    return NextResponse.json(outcome, { status: outcome.found ? 200 : 404, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ error: "FloodPass storage is not switched on yet." }, { status: 503 });
    console.error("floodpass check failed", error);
    return NextResponse.json({ error: "Check failed. Please try again." }, { status: 500 });
  }
}
