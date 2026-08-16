import { NextResponse } from "next/server";
import { fetchLiveFloodFeed } from "@/lib/intelligence/live-flood-feed";
import { loadArchivedFloodReports, mergeFloodReports, persistFloodReports, summarizeFloodReports } from "@/lib/intelligence/flood-report-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const state = (searchParams.get("state") || "").trim().toLowerCase();
  const source = (searchParams.get("source") || "").trim().toLowerCase();
  const requestedLimit = Number(searchParams.get("limit") || "100");
  const requestedDays = Number(searchParams.get("days") || "14");
  const limit = Number.isFinite(requestedLimit) ? Math.min(250, Math.max(1, requestedLimit)) : 100;
  const days = Number.isFinite(requestedDays) ? Math.min(90, Math.max(1, requestedDays)) : 14;

  try {
    const live = await fetchLiveFloodFeed();

    // Persistence is deliberately best-effort. If the archive database is
    // temporarily unavailable, fresh public discovery still reaches users.
    let archived = [] as typeof live.items;
    let persisted = 0;
    try {
      persisted = await persistFloodReports(live.items);
      archived = await loadArchivedFloodReports(days, 500);
    } catch (archiveError) {
      console.error("flood report archive unavailable", archiveError);
    }

    const combined = mergeFloodReports(live.items, archived);
    const filtered = combined
      .filter((item) => !state || item.state.toLowerCase() === state)
      .filter((item) => !source || item.source.toLowerCase().includes(source))
      .slice(0, limit);

    return NextResponse.json({
      generatedAt: live.generatedAt,
      items: filtered,
      count: filtered.length,
      stateSummary: summarizeFloodReports(combined),
      sourceHealth: live.sourceHealth,
      archive: {
        enabled: archived.length > 0 || persisted > 0,
        days,
        archivedItemsLoaded: archived.length,
        liveItemsPersistedThisScan: persisted,
      },
      notice: "These are external flood reports and warnings discovered from news sources and retained in the NaijaClimaGuard archive. They are evidence signals, not NaijaClimaGuard forecasts. Road-level safety must not be inferred from a headline alone.",
    });
  } catch (error) {
    // If live sources all fail, the archive can still keep the feed useful.
    try {
      const archived = await loadArchivedFloodReports(days, limit);
      const filtered = archived
        .filter((item) => !state || item.state.toLowerCase() === state)
        .filter((item) => !source || item.source.toLowerCase().includes(source))
        .slice(0, limit);
      if (filtered.length) {
        return NextResponse.json({
          generatedAt: new Date().toISOString(),
          items: filtered,
          count: filtered.length,
          stateSummary: summarizeFloodReports(archived),
          sourceHealth: [],
          archive: { enabled: true, days, archivedItemsLoaded: archived.length, liveItemsPersistedThisScan: 0 },
          stale: true,
          notice: "Live discovery is temporarily unavailable, so this response is being served from the retained flood-report archive.",
        });
      }
    } catch {}

    return NextResponse.json(
      {
        error: "Live flood news sources are temporarily unreachable.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 502 }
    );
  }
}
