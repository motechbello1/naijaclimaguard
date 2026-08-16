import { NextResponse } from "next/server";
import { scoutNationwideLgas } from "@/lib/intelligence/national-lga-scout";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const state = (searchParams.get("state") || "").trim().toLowerCase();
  const requestedLimit = Number(searchParams.get("limit") || "100");
  const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 100;

  try {
    const result = await scoutNationwideLgas();
    const hotspots = result.hotspots
      .filter((item) => !state || item.state.toLowerCase() === state)
      .slice(0, limit);
    return NextResponse.json({ ...result, hotspots, returnedHotspots: hotspots.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nationwide LGA scout unavailable" },
      { status: 502 },
    );
  }
}
