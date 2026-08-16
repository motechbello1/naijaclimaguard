import { NextResponse } from "next/server";
import { expandNigeriaSentinels } from "@/lib/risk/nigeria-sentinels";
import { deriveUrbanFlashRisk } from "@/lib/risk/urban-flash-v1";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 35;

async function fetchBatch(points: ReturnType<typeof expandNigeriaSentinels>) {
  const latitude = points.map((point) => point.latitude).join(",");
  const longitude = points.map((point) => point.longitude).join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=precipitation&past_hours=168&forecast_hours=6&timezone=Africa%2FLagos`;
  const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`weather provider returned ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload) ? payload : [payload];
}

export async function GET() {
  try {
    const points = expandNigeriaSentinels(9);
    const weatherByPoint: any[] = [];
    for (let i = 0; i < points.length; i += BATCH_SIZE) {
      const batch = points.slice(i, i + BATCH_SIZE);
      const payload = await fetchBatch(batch);
      weatherByPoint.push(...payload);
    }

    const detailed = points.map((point, index) => {
      const weather = weatherByPoint[index];
      if (!weather?.hourly) return { ...point, available: false as const, error: "weather unavailable" };
      try {
        const risk = deriveUrbanFlashRisk(weather.hourly);
        return { ...point, available: true as const, risk };
      } catch {
        return { ...point, available: false as const, error: "could not calculate risk" };
      }
    });

    const stateMap = new Map<string, any>();
    for (const point of detailed) {
      const existing = stateMap.get(point.state) ?? {
        state: point.state,
        city: point.anchorCity,
        latitude: point.latitude,
        longitude: point.longitude,
        available: false,
        monitoredPoints: 0,
        availablePoints: 0,
        highestPoint: null,
        risk: null,
      };
      existing.monitoredPoints += 1;
      if (point.available) {
        existing.available = true;
        existing.availablePoints += 1;
        if (!existing.risk || point.risk.score > existing.risk.score) {
          existing.risk = point.risk;
          existing.latitude = point.latitude;
          existing.longitude = point.longitude;
          existing.highestPoint = point.pointLabel;
        }
      }
      stateMap.set(point.state, existing);
    }

    const sentinels = Array.from(stateMap.values()).sort((a, b) => (b.risk?.score ?? -1) - (a.risk?.score ?? -1));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      coverage: `${points.length} rainfall screening points across all 36 states and the FCT (5 points around each state-capital/metro anchor)`,
      screeningPoints: points.length,
      statesCovered: sentinels.length,
      limitation: "This is denser than a single capital point, but it is still a weather-model screening grid, not street-level radar or drainage sensing. It should flag suspicious rainfall patterns earlier while verified local evidence remains necessary for road-level decisions.",
      sentinels,
      detailedPoints: detailed.map((point) => ({
        id: point.id,
        state: point.state,
        city: point.anchorCity,
        pointLabel: point.pointLabel,
        latitude: point.latitude,
        longitude: point.longitude,
        available: point.available,
        risk: point.available ? point.risk : undefined,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Nationwide rainfall nowcast is temporarily unavailable", detail: error instanceof Error ? error.message : "unknown error" },
      { status: 502 }
    );
  }
}
