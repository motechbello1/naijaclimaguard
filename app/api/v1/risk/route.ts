import { NextResponse } from "next/server";
import { fetchDerivedV2Risk } from "@/lib/risk/derived-v2";

/**
 * GET /api/v1/risk?latitude=..&longitude=..
 * Public live-risk endpoint.
 *
 * CURRENT MODEL: disclosed rainfall / antecedent-wetness heuristic using
 * Open-Meteo weather data. It does not currently ingest NASA IMERG directly,
 * GloFAS river discharge, or the Validation v2 XGBoost model.
 *
 * The exact derived-v2 calculation lives in lib/risk/derived-v2.ts so the
 * public API and alert engine cannot drift onto different formulas.
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("latitude") ?? "");
  const lon = parseFloat(searchParams.get("longitude") ?? "");

  if (
    !Number.isFinite(lat) || lat < -90 || lat > 90 ||
    !Number.isFinite(lon) || lon < -180 || lon > 180
  ) {
    return NextResponse.json(
      {
        error: "latitude and longitude required.",
        example: "/api/v1/risk?latitude=9.06&longitude=7.49",
      },
      { status: 400 }
    );
  }

  try {
    const result = await fetchDerivedV2Risk(lat, lon);

    return NextResponse.json({
      ...result,
      meta: {
        model: "derived-v2",
        model_status:
          "live heuristic decision-support index; independent Validation v2 model is evaluated separately",
        formula:
          "0.40·rainfall(7d/200mm) + 0.35·burst(max of 3d/120mm OR hourly/30mm) + 0.25·antecedent-wetness proxy",
        data_source: "Open-Meteo forecast API · precipitation + ET0 · daily and hourly",
        source_note: "This live endpoint does not currently ingest NASA IMERG or GloFAS directly.",
        flood_type_note: "flood_type is a rainfall-pattern heuristic, not a hydraulic classification",
        latitude: lat,
        longitude: lon,
        generated_at: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Weather feed unreachable. Retry shortly." },
      { status: 502 }
    );
  }
}
