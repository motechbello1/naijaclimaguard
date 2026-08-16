import { NextResponse } from "next/server";
import { fetchLiveFloodFeed } from "@/lib/intelligence/live-flood-feed";
import { auditForecastLeadTimes } from "@/lib/risk/forecast-lead-audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let state = (searchParams.get("state") || "").trim();
  let eventAt = (searchParams.get("eventAt") || "").trim();
  let headline = "";
  let source = "";

  try {
    if (!state || !eventAt) {
      const feed = await fetchLiveFloodFeed();
      const recentReported = feed.items
        .filter((item) => item.status === "REPORTED" && item.state !== "Nigeria / location unparsed")
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      const target = recentReported.find((item) => item.state === "FCT") || recentReported[0];
      if (!target) return NextResponse.json({ error: "No recent geolocated flood report is available for forecast replay." }, { status: 404 });
      state = target.state;
      eventAt = target.publishedAt;
      headline = target.title;
      source = target.source;
    }

    const audits = await auditForecastLeadTimes(state, eventAt, [6, 12, 24, 48]);
    const usable = audits.filter((item) => item.available && typeof item.signalScore === "number");
    const earliestUseful = [...usable]
      .filter((item) => (item.signalScore || 0) >= 35)
      .sort((a, b) => b.effectiveLeadHours - a.effectiveLeadHours)[0] || null;

    return NextResponse.json({
      state,
      eventAt,
      headline: headline || null,
      source: source || null,
      audits,
      finding: earliestUseful
        ? `Archived ECMWF guidance contained an elevated rainfall/convective signal roughly ${earliestUseful.effectiveLeadHours} hours before the first selected public report.`
        : "The replayed ECMWF runs did not cross the current elevated-signal threshold at the five-point urban screening grid. That is a genuine forecast miss under this screening logic, not a hidden success.",
      earliestUsefulLeadHours: earliestUseful?.effectiveLeadHours ?? null,
      methodology: "Replays individual ECMWF IFS forecast runs that would have been available before the event. A conservative six-hour model publication delay is applied so the audit never credits NaijaClimaGuard with a forecast that had not yet been distributed.",
      safety: "This score is a retrospective rainfall/convective signal audit, not proof that a specific road could have been declared flooded or closed at that time.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Forecast lead-time audit unavailable" }, { status: 502 });
  }
}
