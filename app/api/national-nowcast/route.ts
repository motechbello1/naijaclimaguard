import { NextResponse } from "next/server";
import { NIGERIA_SENTINELS } from "@/lib/risk/nigeria-sentinels";
import { deriveUrbanFlashRisk } from "@/lib/risk/urban-flash-v1";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const latitude = NIGERIA_SENTINELS.map((point) => point.latitude).join(",");
    const longitude = NIGERIA_SENTINELS.map((point) => point.longitude).join(",");
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&hourly=precipitation&past_hours=168&forecast_hours=6&timezone=Africa%2FLagos`;

    const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`weather provider returned ${response.status}`);
    const payload = await response.json();
    const locations = Array.isArray(payload) ? payload : [payload];

    const sentinels = NIGERIA_SENTINELS.map((point, index) => {
      const weather = locations[index];
      if (!weather?.hourly) {
        return { ...point, available: false as const, error: "weather unavailable" };
      }
      try {
        const risk = deriveUrbanFlashRisk(weather.hourly);
        return { ...point, available: true as const, risk };
      } catch {
        return { ...point, available: false as const, error: "could not calculate risk" };
      }
    }).sort((a, b) => {
      const aScore = a.available ? a.risk.score : -1;
      const bScore = b.available ? b.risk.score : -1;
      return bScore - aScore;
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      coverage: "one urban rainfall sentinel at each state capital plus the FCT",
      limitation: "A capital-city sentinel is an early screening point, not a state-wide flood declaration. Road-level warnings require denser gauges, radar/nowcast data or geolocated incident evidence.",
      sentinels,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Nationwide rainfall nowcast is temporarily unavailable", detail: error instanceof Error ? error.message : "unknown error" },
      { status: 502 }
    );
  }
}
