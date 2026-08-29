import { NextResponse } from "next/server";
import { fetchNoApprovalHazardForecast } from "@/lib/risk/no-approval-hazards";
import { findOfficialSafetyState } from "@/lib/intelligence/official-advisory";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/my-tomorrow?latitude=7.8023&longitude=6.7333&name=Lokoja
 *
 * Human-facing, no-approval data proof. It answers:
 * - what is coming
 * - when it may affect the location
 * - how serious the signal is
 * - what it could affect
 * - what a person can safely do before it arrives
 *
 * It intentionally does not invent naira-loss estimates. Those belong to the
 * exposure layer once real household/business/property inputs are available.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const latitude = Number(searchParams.get("latitude"));
  const longitude = Number(searchParams.get("longitude"));
  const name = searchParams.get("name")?.trim() || null;

  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    return NextResponse.json(
      {
        error: "latitude and longitude are required",
        example: "/api/v1/my-tomorrow?latitude=7.8023&longitude=6.7333&name=Lokoja",
      },
      { status: 400 }
    );
  }

  try {
    const [forecast, official] = await Promise.all([
      fetchNoApprovalHazardForecast(latitude, longitude, name),
      findOfficialSafetyState(latitude, longitude),
    ]);

    return NextResponse.json({
      ...forecast,
      official_safety_state: official ?? {
        active: false,
        level: "NONE",
        headline: null,
        instruction:
          "No fresh nearby official advisory is present in the connected source store. Continue to follow official instructions received through other channels.",
      },
      product_answer: {
        what_is_coming: forecast.primary_hazard?.title ?? "No major environmental danger is showing right now.",
        when: forecast.primary_hazard?.when ?? "No strong onset signal in the next 7 days.",
        how_serious: forecast.primary_hazard?.severity ?? "LOW",
        what_it_could_affect: forecast.primary_hazard?.affects ?? [],
        what_to_do: forecast.primary_hazard?.actions ?? ["No special action is suggested from the current forecast. Keep checking as conditions change."],
      },
      meta: {
        engine: "no-approval-hazards-v1",
        public_warning_authority: false,
        core_source: "Open-Meteo Forecast API",
        optional_detail_source: "Open-Meteo ECMWF IFS API",
        source_access: "No API key or approval queue required by this implementation.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Live forecast source is temporarily unavailable.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 502 }
    );
  }
}
