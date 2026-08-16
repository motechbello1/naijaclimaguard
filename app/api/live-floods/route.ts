import { NextResponse } from "next/server";
import { fetchLiveFloodFeed } from "@/lib/intelligence/live-flood-feed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const state = (searchParams.get("state") || "").trim().toLowerCase();
  const source = (searchParams.get("source") || "").trim().toLowerCase();
  const requestedLimit = Number(searchParams.get("limit") || "100");
  const limit = Number.isFinite(requestedLimit) ? Math.min(150, Math.max(1, requestedLimit)) : 100;

  try {
    const result = await fetchLiveFloodFeed();
    const filtered = result.items
      .filter((item) => !state || item.state.toLowerCase() === state)
      .filter((item) => !source || item.source.toLowerCase().includes(source))
      .slice(0, limit);

    return NextResponse.json({
      ...result,
      items: filtered,
      count: filtered.length,
      notice: "These are external flood reports and warnings discovered from news sources. They are evidence signals, not NaijaClimaGuard forecasts. Road-level safety must not be inferred from a headline alone.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Live flood news sources are temporarily unreachable.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 502 }
    );
  }
}
