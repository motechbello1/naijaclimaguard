import { NextResponse } from "next/server";
import { fetchLiveFloodFeed } from "@/lib/intelligence/live-flood-feed";
import { NIGERIA_SENTINELS } from "@/lib/risk/nigeria-sentinels";
import { deriveUrbanFlashRisk } from "@/lib/risk/urban-flash-v1";

export const dynamic = "force-dynamic";

async function fetchHourly(latitude: number, longitude: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=precipitation&past_hours=168&forecast_hours=6&timezone=Africa%2FLagos`;
  const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error("hourly rainfall feed unavailable");
  const payload = await response.json();
  return payload.hourly;
}

export async function GET() {
  try {
    const feed = await fetchLiveFloodFeed();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = feed.items.filter((item) =>
      item.status === "REPORTED" &&
      item.state !== "Nigeria / location unparsed" &&
      new Date(item.publishedAt).getTime() >= cutoff
    );

    const earliestByState = new Map<string, typeof recent[number]>();
    for (const item of recent) {
      const current = earliestByState.get(item.state);
      if (!current || new Date(item.publishedAt) < new Date(current.publishedAt)) earliestByState.set(item.state, item);
    }

    const audits = await Promise.all(Array.from(earliestByState.values()).slice(0, 12).map(async (report) => {
      const sentinel = NIGERIA_SENTINELS.find((point) => point.state === report.state);
      if (!sentinel) return null;
      try {
        const hourly = await fetchHourly(sentinel.latitude, sentinel.longitude);
        const risk = deriveUrbanFlashRisk(hourly, report.publishedAt);
        return {
          state: report.state,
          sentinel: sentinel.city,
          firstReportAt: report.publishedAt,
          firstReportTitle: report.title,
          firstReportSource: report.source,
          observedRainfallAudit: risk,
          outcome: risk.score >= 40 ? "RAINFALL_SIGNAL_PRESENT" : "MISS_TO_LEARN",
          explanation: risk.score >= 40
            ? "The observed rainfall screen was already elevated by the time public flood reporting appeared."
            : "A flood was publicly reported while this coarse rainfall screen remained below WATCH. This is automatically treated as a miss case for model/data improvement, not hidden as a successful forecast.",
        };
      } catch (error) {
        return {
          state: report.state,
          sentinel: sentinel.city,
          firstReportAt: report.publishedAt,
          firstReportTitle: report.title,
          firstReportSource: report.source,
          observedRainfallAudit: null,
          outcome: "AUDIT_DATA_UNAVAILABLE",
          explanation: error instanceof Error ? error.message : "Could not reconstruct rainfall screen.",
        };
      }
    }));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      audits: audits.filter(Boolean),
      methodology: "For each state/FCT with a flood occurrence reported in the last 24 hours, NaijaClimaGuard reconstructs the rainfall-only screening score at the time of the earliest discovered report using the state-capital sentinel. A score below WATCH is recorded as a miss-to-learn case.",
      limitation: "This audit uses a coarse capital-city weather-model point and observed rainfall history, not archived radar or the exact flooded road. A miss can therefore mean the rainfall model missed a local cloudburst, the event occurred away from the sentinel, drainage vulnerability dominated, or the threshold logic is inadequate.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Incident reconciliation unavailable" }, { status: 502 });
  }
}
