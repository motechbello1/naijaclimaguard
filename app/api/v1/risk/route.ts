import { NextResponse } from "next/server";

/**
 * GET /api/v1/risk?latitude=..&longitude=..
 * Public live-risk endpoint.
 *
 * CURRENT MODEL: disclosed rainfall / antecedent-wetness heuristic using
 * Open-Meteo weather data. It does not currently ingest NASA IMERG directly,
 * GloFAS river discharge, or the Validation v2 XGBoost model.
 *
 * The hourly signal improves sensitivity to short-duration rainfall bursts, but
 * this endpoint must not be described as an independently validated 48/72-hour
 * flood forecast until Validation v2 produces that evidence.
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("latitude") ?? "");
  const lon = parseFloat(searchParams.get("longitude") ?? "");

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "latitude and longitude required.", example: "/api/v1/risk?latitude=9.06&longitude=7.49" }, { status: 400 });
  }

  try {
    const [dailyRes, hourlyRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,et0_fao_evapotranspiration&past_days=10&forecast_days=4&timezone=Africa%2FLagos`, { cache: "no-store", signal: AbortSignal.timeout(8000) }),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation&past_hours=48&forecast_hours=0&timezone=Africa%2FLagos`, { cache: "no-store", signal: AbortSignal.timeout(8000) }),
    ]);

    if (!dailyRes.ok) throw new Error("upstream unavailable");
    const daily = (await dailyRes.json()).daily;

    // Hourly precipitation is best-effort. The endpoint still returns the
    // accumulation-based score when the secondary hourly request is unavailable.
    let hourlyPrecip: number[] = [];
    if (hourlyRes.ok) {
      const h = (await hourlyRes.json()).hourly;
      hourlyPrecip = h?.precipitation ?? [];
    }

    const idx = daily.time.length - 5;
    const p: number[] = daily.precipitation_sum ?? [];
    const et0: number[] = daily.et0_fao_evapotranspiration ?? [];
    const sum = (a: number[], x: number, y: number) => a.slice(Math.max(0, x), y).reduce((m, n) => m + (n || 0), 0);
    const precip7 = sum(p, idx - 6, idx + 1);
    const precip3 = sum(p, idx - 2, idx + 1);
    const balance7 = precip7 - sum(et0, idx - 6, idx + 1);
    const rainfallNorm = Math.min(1, precip7 / 200);
    const burstDaily = Math.min(1, precip3 / 120);
    const satNorm = Math.min(1, Math.max(0, (balance7 + 40) / 160));

    const maxHourly = hourlyPrecip.length ? Math.max(0, ...hourlyPrecip.map(v => v ?? 0)) : 0;
    let hourlyBurst = Math.min(1, maxHourly / 30);
    let max3h = 0;
    for (let i = 2; i < hourlyPrecip.length; i++) {
      max3h = Math.max(max3h, (hourlyPrecip[i] ?? 0) + (hourlyPrecip[i - 1] ?? 0) + (hourlyPrecip[i - 2] ?? 0));
    }
    hourlyBurst = Math.max(hourlyBurst, Math.min(1, max3h / 60));

    const effectiveBurst = Math.max(burstDaily, hourlyBurst);
    // This is a rainfall-pattern descriptor only; it is not a hydraulic flood-type classifier.
    const floodType = hourlyBurst > burstDaily + 0.1 ? "urban" : burstDaily > hourlyBurst + 0.1 ? "riverine" : "mixed";
    const score = Math.max(0, Math.min(100, Math.round((rainfallNorm * 0.40 + effectiveBurst * 0.35 + satNorm * 0.25) * 100)));
    const level = score >= 90 ? "EXTREME" : score >= 75 ? "SEVERE" : score >= 60 ? "WARNING" : score >= 40 ? "WATCH" : "NORMAL";

    return NextResponse.json({
      risk: { score, level, flood_type: floodType },
      factors: {
        rainfall_7d: +rainfallNorm.toFixed(2),
        burst_intensity: +effectiveBurst.toFixed(2),
        // Backward-compatible field name. This value is an antecedent-wetness
        // proxy from rainfall minus ET0, not observed soil-moisture data.
        soil_saturation: +satNorm.toFixed(2),
      },
      hourly: {
        max_mm_per_hour: +maxHourly.toFixed(1),
        max_3h_mm: +max3h.toFixed(1),
        classification: maxHourly >= 20 ? "heavy" : maxHourly >= 10 ? "moderate" : maxHourly >= 2 ? "light" : "trace",
      },
      raw_weather: {
        precipitation_7d_mm: +precip7.toFixed(1),
        precipitation_3d_mm: +precip3.toFixed(1),
        moisture_balance_7d_mm: +balance7.toFixed(1),
      },
      meta: {
        model: "derived-v2",
        model_status: "live heuristic decision-support index; independent Validation v2 model is evaluated separately",
        formula: "0.40·rainfall(7d/200mm) + 0.35·burst(max of 3d/120mm OR hourly/30mm) + 0.25·antecedent-wetness proxy",
        data_source: "Open-Meteo forecast API · precipitation + ET0 · daily and hourly",
        source_note: "This live endpoint does not currently ingest NASA IMERG or GloFAS directly.",
        flood_type_note: "flood_type is a rainfall-pattern heuristic, not a hydraulic classification",
        latitude: lat,
        longitude: lon,
        generated_at: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Weather feed unreachable. Retry shortly." }, { status: 502 });
  }
}
