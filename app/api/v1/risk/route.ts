import { NextResponse } from "next/server";
import { fetchDerivedV2Risk } from "@/lib/risk/derived-v2";
import { findOfficialSafetyState, findReportedStateWarning, publicStatus } from "@/lib/intelligence/official-advisory";

/**
 * GET /api/v1/risk?latitude=..&longitude=..
 * Public live-risk endpoint.
 *
 * CURRENT MODEL: disclosed rainfall / antecedent-wetness heuristic using
 * Open-Meteo weather data. It does not currently ingest NASA IMERG directly,
 * GloFAS river discharge, or the Validation v2 XGBoost model.
 *
 * Official advisories are returned as a separate safety-state overlay. They do
 * not modify the numeric model score. This prevents operational authority from
 * being mixed into ML evidence while ensuring a low score cannot hide a fresh
 * official warning.
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
    const [result, official, reported] = await Promise.all([
      fetchDerivedV2Risk(lat, lon),
      findOfficialSafetyState(lat, lon),
      findReportedStateWarning(lat, lon),
    ]);
    // Official warnings always win over the model score. A connected official
    // feed is preferred; an official warning reported in the news is next.
    const safety = official ?? reported;

    return NextResponse.json({
      ...result,
      // The single status to show the public. Never "safe", never "NORMAL".
      public_status: publicStatus((result as { risk?: { level?: string } }).risk?.level, safety),
      safety_state: safety ?? {
        active: false,
        level: "NONE",
        headline: null,
        instruction: "No fresh nearby official advisory is present in the connected source store. Continue to follow visible conditions and official instructions received through other channels.",
      },
      meta: {
        model: "derived-v2",
        model_status:
          "live heuristic decision-support index; independent Validation v2 and Model v5 work are evaluated separately",
        formula:
          "0.40·rainfall(7d/200mm) + 0.35·burst(max of 3d/120mm OR hourly/30mm) + 0.25·antecedent-wetness proxy",
        data_source: "Open-Meteo forecast API · precipitation + ET0 · daily and hourly",
        source_note: "The numeric live score still comes from derived-v2. Official advisories (from a connected feed, or official warnings reported in the news for this state) are returned as a safety overlay and decide public_status, but never alter the numeric score.",
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
