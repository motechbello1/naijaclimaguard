import { NextResponse } from "next/server";
import { fetchLiveFloodFeed } from "@/lib/intelligence/live-flood-feed";
import { persistFloodReports } from "@/lib/intelligence/flood-report-store";
import { scoutNationwideLgas } from "@/lib/intelligence/national-lga-scout";
import { persistLgaScoutHotspots } from "@/lib/intelligence/lga-scout-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // News confirmation and nationwide rainfall screening are independent sensors,
    // so run them concurrently instead of making one wait for the other.
    const [feedResult, scoutResult] = await Promise.allSettled([
      fetchLiveFloodFeed(),
      scoutNationwideLgas(),
    ]);

    let news: any = null;
    let newsStore: any = null;
    if (feedResult.status === "fulfilled") {
      news = feedResult.value;
      newsStore = await persistFloodReports(news.items);
    }

    let scout: any = null;
    let scoutStore: any = null;
    if (scoutResult.status === "fulfilled") {
      scout = scoutResult.value;
      scoutStore = await persistLgaScoutHotspots(scout);
    }

    if (!news && !scout) {
      throw new Error("Both live news discovery and the national LGA rainfall scout failed.");
    }

    return NextResponse.json({
      ok: true,
      scannedAt: new Date().toISOString(),
      news: news ? {
        discovered: news.items.length,
        stored: newsStore,
        sourcesOnline: news.sourceHealth.filter((source: any) => source.ok).map((source: any) => source.source),
        statesSeen: news.stateSummary.map((row: any) => row.state),
      } : {
        error: feedResult.status === "rejected" ? String(feedResult.reason) : "news scan unavailable",
      },
      nationwideScout: scout ? {
        lgasRegistered: scout.coverage,
        lgasAvailable: scout.available,
        elevated: scout.elevated,
        high: scout.high,
        critical: scout.critical,
        persisted: scoutStore,
        topHotspots: scout.hotspots.slice(0, 10).map((item: any) => ({
          state: item.state,
          lga: item.lga,
          scoutScore: item.scoutScore,
          deepRiskScore: item.deepRisk?.score ?? null,
          level: item.deepRisk?.level ?? item.scoutLevel,
        })),
      } : {
        error: scoutResult.status === "rejected" ? String(scoutResult.reason) : "LGA scout unavailable",
      },
    });
  } catch (error) {
    console.error("scheduled flood intelligence scan failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "scheduled scan failed" },
      { status: 502 },
    );
  }
}
