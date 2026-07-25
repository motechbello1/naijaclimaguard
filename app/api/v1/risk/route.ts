import { NextResponse } from "next/server";

/**
 * GET /api/v1/risk?latitude=..&longitude=..
 * Public Risk API — live data, honest model attribution.
 *
 * Uses the disclosed multi-factor formula calibrated to physical flood thresholds.
 * The trained XGBoost (ROC-AUC 1.0) currently has target leakage — it produces
 * 100/100 everywhere during rainy season because labels derive from the same
 * features. Until retrained on independent ground-truth (citizen reports), the
 * disclosed formula is the honest, calibrated primary.
 */

export const dynamic = "force-dynamic";

function deriveRisk(daily: any) {
  const idx = daily.time.length - 5;
  const p: number[] = daily.precipitation_sum ?? [];
  const et0: number[] = daily.et0_fao_evapotranspiration ?? [];
  const sum = (a: number[], x: number, y: number) =>
    a.slice(Math.max(0, x), y).reduce((m, n) => m + (n || 0), 0);
  const precip7 = sum(p, idx - 6, idx + 1);
  const precip3 = sum(p, idx - 2, idx + 1);
  const balance7 = precip7 - sum(et0, idx - 6, idx + 1);
  const rainfall = Math.min(1, precip7 / 200);
  const burst = Math.min(1, precip3 / 120);
  const saturation = Math.min(1, Math.max(0, (balance7 + 40) / 160));
  const score = Math.round((rainfall * 0.45 + burst * 0.3 + saturation * 0.25) * 100);
  const level = score >= 90 ? "EXTREME" : score >= 75 ? "SEVERE" : score >= 60 ? "WARNING" : score >= 40 ? "WATCH" : "NORMAL";
  return {
    score, level,
    factors: {
      rainfall_intensity: +rainfall.toFixed(2),
      burst_intensity: +burst.toFixed(2),
      soil_saturation: +saturation.toFixed(2),
    },
    raw: {
      precipitation_7d_mm: +precip7.toFixed(1),
      precipitation_3d_mm: +precip3.toFixed(1),
      moisture_balance_7d_mm: +balance7.toFixed(1),
    },
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("latitude") ?? "");
  const lon = parseFloat(searchParams.get("longitude") ?? "");

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return NextResponse.json(
      { error: "latitude and longitude required.", example: "/api/v1/risk?latitude=7.8023&longitude=6.7333" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&daily=precipitation_sum,et0_fao_evapotranspiration&past_days=10&forecast_days=4&timezone=Africa%2FLagos`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error("upstream unavailable");
    const { daily } = await res.json();
    const r = deriveRisk(daily);
    return NextResponse.json({
      risk: { score: r.score, level: r.level },
      factors: r.factors,
      raw_weather: r.raw,
      meta: {
        model: "derived-v1",
        model_service: "primary — calibrated to physical flood thresholds",
        formula: "0.45·rainfall(7d/200mm) + 0.30·burst(3d/120mm) + 0.25·saturation(balance)",
        data_source: "Open-Meteo (NASA GPM IMERG derived)",
        xgboost_status: "deployed but suspended — target leakage (ROC-AUC 1.0) needs citizen ground-truth retraining",
        latitude: lat, longitude: lon,
        generated_at: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Weather feed unreachable. No cached or synthetic data served — retry shortly." },
      { status: 502 }
    );
  }
}
