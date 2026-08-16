import { NextResponse } from "next/server";
import { fetchLiveFloodFeed } from "@/lib/intelligence/live-flood-feed";
import { expandNigeriaSentinels } from "@/lib/risk/nigeria-sentinels";
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

    const allGridPoints = expandNigeriaSentinels(9);
    const audits = await Promise.all(Array.from(earliestByState.values()).slice(0, 12).map(async (report) => {
      const points = allGridPoints.filter((point) => point.state === report.state);
      if (!points.length) return null;
      try {
        const scored = await Promise.all(points.map(async (point) => {
          const hourly = await fetchHourly(point.latitude, point.longitude);
          const risk = deriveUrbanFlashRisk(hourly, report.publishedAt);
          return { point, risk };
        }));
        scored.sort((a, b) => b.risk.score - a.risk.score);
        const highest = scored[0];
        return {
          state: report.state,
          sentinel: highest.point.anchorCity,
          screeningPoint: highest.point.pointLabel,
          pointsChecked: scored.length,
          firstReportAt: report.publishedAt,
          firstReportTitle: report.title,
          firstReportSource: report.source,
          observedRainfallAudit: highest.risk,
          pointScores: scored.map(({ point, risk }) => ({ point: point.pointLabel, score: risk.score, level: risk.level })),
          outcome: highest.risk.score >= 40 ? "RAINFALL_SIGNAL_PRESENT" : "MISS_TO_LEARN",
          explanation: highest.risk.score >= 40
            ? `At least one of the ${scored.length} urban screening points was already elevated by the time public flood reporting appeared.`
            : `The flood was publicly reported while all ${scored.length} urban rainfall screening points remained below WATCH. This is recorded as a miss-to-learn case rather than being hidden as a successful forecast.`,
        };
      } catch (error) {
        return {
          state: report.state,
          sentinel: points[0].anchorCity,
          screeningPoint: null,
          pointsChecked: points.length,
          firstReportAt: report.publishedAt,
          firstReportTitle: report.title,
          firstReportSource: report.source,
          observedRainfallAudit: null,
          pointScores: [],
          outcome: "AUDIT_DATA_UNAVAILABLE",
          explanation: error instanceof Error ? error.message : "Could not reconstruct rainfall screen.",
        };
      }
    }));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      audits: audits.filter(Boolean),
      methodology: "For each state/FCT with a flood occurrence reported in the last 24 hours, NaijaClimaGuard reconstructs the rainfall-only score at five urban grid points around that state-capital/metro anchor at the time of the earliest discovered report. The highest score is used. If all five remain below WATCH, the incident becomes a miss-to-learn case.",
      limitation: "This is materially better than one city-centre point but it is still weather-model rainfall, not archived radar, drainage telemetry or the exact flooded road. A miss can indicate a highly local cloudburst, drainage/terrain vulnerability, an event outside the grid, or inadequate thresholds.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Incident reconciliation unavailable" }, { status: 502 });
  }
}
