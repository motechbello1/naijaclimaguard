import { NextResponse } from "next/server";
import { fetchLiveFloodFeed } from "@/lib/intelligence/live-flood-feed";
import { persistFloodReports } from "@/lib/intelligence/flood-report-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const feed = await fetchLiveFloodFeed();
    const stored = await persistFloodReports(feed.items);
    return NextResponse.json({
      ok: true,
      scannedAt: feed.generatedAt,
      discovered: feed.items.length,
      stored,
      sourcesOnline: feed.sourceHealth.filter((source) => source.ok).map((source) => source.source),
      statesSeen: feed.stateSummary.map((row) => row.state),
    });
  } catch (error) {
    console.error("scheduled flood intelligence scan failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "scheduled scan failed" },
      { status: 502 },
    );
  }
}
