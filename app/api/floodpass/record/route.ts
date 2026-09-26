import { NextResponse } from "next/server";
import { isStorageNotReady, verifyRecord } from "@/lib/floodpass/service";

export const dynamic = "force-dynamic";

/** GET /api/floodpass/record: re-checks every fingerprint in the Flood Record. Public. */
export async function GET() {
  try {
    return NextResponse.json(await verifyRecord(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ error: "FloodPass storage is not switched on yet." }, { status: 503 });
    console.error("floodpass record check failed", error);
    return NextResponse.json({ error: "Record check failed." }, { status: 500 });
  }
}
