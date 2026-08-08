import { NextResponse } from "next/server";

/**
 * POST /api/reports/generate
 * Generates a dated situation report from the same disclosed live signal family
 * used by the public risk endpoint: Open-Meteo precipitation + ET0, with hourly
 * rainfall intensity when available.
 *
 * No historical ML performance or fixed lead-time claim is included here.
 */

const STATIONS = [
  { id: "LKJ-01", name: "Lokoja", state: "Kogi", lat: 7.8023, lon: 6.7333 },
  { id: "MKD-02", name: "Makurdi", state: "Benue", lat: 7.7322, lon: 8.5391 },
  { id: "ONI-03", name: "Onitsha", state: "Anambra", lat: 6.1407, lon: 6.7869 },
  { id: "YEN-04", name: "Yenagoa", state: "Bayelsa", lat: 4.9247, lon: 6.2642 },
  { id: "HDJ-05", name: "Hadejia", state: "Jigawa", lat: 12.4494, lon: 10.0447 },
  { id: "IBI-06", name: "Ibi", state: "Taraba", lat: 8.1817, lon: 9.7442 },
];

function derive(daily: any, hourlyPrecip: number[]) {
  const idx = daily.time.length - 5;
  const p: number[] = daily.precipitation_sum ?? [];
  const et0: number[] = daily.et0_fao_evapotranspiration ?? [];
  const sum = (a: number[], x: number, y: number) => a.slice(Math.max(0, x), y).reduce((m, n) => m + (n || 0), 0);

  const p7 = sum(p, idx - 6, idx + 1);
  const p3 = sum(p, idx - 2, idx + 1);
  const bal = p7 - sum(et0, idx - 6, idx + 1);

  const rainfallNorm = Math.min(1, p7 / 200);
  const burstDaily = Math.min(1, p3 / 120);
  const wetnessProxy = Math.min(1, Math.max(0, (bal + 40) / 160));

  const maxHourly = hourlyPrecip.length ? Math.max(0, ...hourlyPrecip.map((v) => v ?? 0)) : 0;
  let max3h = 0;
  for (let i = 2; i < hourlyPrecip.length; i++) {
    max3h = Math.max(max3h, (hourlyPrecip[i] ?? 0) + (hourlyPrecip[i - 1] ?? 0) + (hourlyPrecip[i - 2] ?? 0));
  }
  const hourlyBurst = Math.max(Math.min(1, maxHourly / 30), Math.min(1, max3h / 60));
  const effectiveBurst = Math.max(burstDaily, hourlyBurst);

  const score = Math.max(0, Math.min(100, Math.round((rainfallNorm * 0.40 + effectiveBurst * 0.35 + wetnessProxy * 0.25) * 100)));
  const level = score >= 90 ? "EXTREME" : score >= 75 ? "SEVERE" : score >= 60 ? "WARNING" : score >= 40 ? "WATCH" : "NORMAL";

  return {
    score,
    level,
    p7: +p7.toFixed(1),
    p3: +p3.toFixed(1),
    maxHourly: +maxHourly.toFixed(1),
  };
}

export async function POST() {
  const results: string[] = [];
  let reachable = 0;

  for (const st of STATIONS) {
    try {
      const [dailyRes, hourlyRes] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${st.lat}&longitude=${st.lon}&daily=precipitation_sum,et0_fao_evapotranspiration&past_days=10&forecast_days=4&timezone=Africa%2FLagos`,
          { cache: "no-store", signal: AbortSignal.timeout(8000) }
        ),
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${st.lat}&longitude=${st.lon}&hourly=precipitation&past_hours=48&forecast_hours=0&timezone=Africa%2FLagos`,
          { cache: "no-store", signal: AbortSignal.timeout(8000) }
        ),
      ]);

      if (!dailyRes.ok) throw new Error();
      const { daily } = await dailyRes.json();
      let hourlyPrecip: number[] = [];
      if (hourlyRes.ok) {
        const h = (await hourlyRes.json()).hourly;
        hourlyPrecip = h?.precipitation ?? [];
      }

      const r = derive(daily, hourlyPrecip);
      reachable++;
      results.push(
        `${st.id.padEnd(8)} ${st.name.padEnd(10)} ${st.state.padEnd(9)} risk ${String(r.score).padStart(3)}/100  ${r.level.padEnd(8)} 7d rain ${String(r.p7).padStart(6)}mm  3d ${String(r.p3).padStart(5)}mm  max hourly ${String(r.maxHourly).padStart(5)}mm`
      );
    } catch {
      results.push(`${st.id.padEnd(8)} ${st.name.padEnd(10)} ${st.state.padEnd(9)} live feed unreachable at report time`);
    }
  }

  const now = new Date();
  const report = `
NAIJACLIMAGUARD — LIVE FLOOD-RISK SITUATION REPORT
Generated: ${now.toISOString()} (Africa/Lagos local: ${now.toLocaleString("en-NG", { timeZone: "Africa/Lagos" })})

LIVE STATION ASSESSMENT (${reachable}/${STATIONS.length} feeds reachable)
${"-".repeat(96)}
${results.join("\n")}
${"-".repeat(96)}

CURRENT DATA & MODEL PROVENANCE
Live data source:      Open-Meteo forecast API — precipitation + FAO ET0,
                       with recent hourly precipitation when available.
Live risk model:       derived-v2 heuristic decision-support index.
Formula:               0.40*7d rainfall + 0.35*rainfall burst +
                       0.25*antecedent-wetness proxy (normalized components).
Important limitation:  The live endpoint does not currently ingest NASA IMERG
                       or GloFAS directly, and the wetness term is not observed
                       soil moisture.

VALIDATION V2 STATUS
A separate independent validation pipeline is evaluating NASA GPM IMERG
rainfall + Copernicus/ECMWF GloFAS river discharge + ERA5-Land surface-state
variables against documented Nigerian flood events using chronological holdout.
No headline ROC-AUC, precision/recall, false-alarm rate, or fixed 48/72-hour
lead-time result is published here until that benchmark and archived forecast
replay are completed.

INTERPRETATION
This report is a live decision-support snapshot, not an official evacuation
order or substitute for NiHSA, NiMet, NEMA, SEMA, or local emergency guidance.
Any station marked "unreachable" reflects a network/data-feed condition at the
time the report was generated.

Built by Bello Muhammad Mustapha — NaijaClimaGuard
`.trim();

  return new NextResponse(report, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="NaijaClimaGuard-Situation-Report-${now.toISOString().slice(0, 10)}.txt"`,
    },
  });
}
