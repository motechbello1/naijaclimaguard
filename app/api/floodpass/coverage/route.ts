import { NextResponse } from "next/server";
import { coverageByState } from "@/lib/floodpass/coverage";

export const dynamic = "force-dynamic";

/** GET /api/floodpass/coverage: what FloodPass watches in each of the 36 states and the FCT. Public, no personal data. */
export async function GET() {
  try {
    const report = await coverageByState();
    return NextResponse.json(report, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } });
  } catch (error) {
    console.error("floodpass coverage failed", error);
    return NextResponse.json({ error: "Coverage is not available right now." }, { status: 503 });
  }
}
