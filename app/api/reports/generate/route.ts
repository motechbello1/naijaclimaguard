import { NextResponse } from "next/server";
import { fetchDerivedV2Risk } from "@/lib/risk/derived-v2";

/**
 * POST /api/reports/generate
 * Generates a dated situation report from the exact same derived-v2 engine used
 * by the public risk endpoint, dashboard, My Area and alert workflows.
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

export async function POST() {
  const results: string[] = [];
  let reachable = 0;

  for (const st of STATIONS) {
    try {
      const r = await fetchDerivedV2Risk(st.lat, st.lon);
      reachable++;
      results.push(
        `${st.id.padEnd(8)} ${st.name.padEnd(10)} ${st.state.padEnd(9)} risk ${String(r.risk.score).padStart(3)}/100  ${r.risk.level.padEnd(8)} 7d rain ${String(r.raw_weather.precipitation_7d_mm).padStart(6)}mm  3d ${String(r.raw_weather.precipitation_3d_mm).padStart(5)}mm  max hourly ${String(r.hourly.max_mm_per_hour).padStart(5)}mm`
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
Implementation:        one shared production engine used by API, dashboard,
                       My Area, Intelligence Center, alerts and this report.
Formula:               0.40*7d rainfall + 0.35*effective rainfall burst +
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
