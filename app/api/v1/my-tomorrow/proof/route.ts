import { NextResponse } from "next/server";
import { fetchNoApprovalHazardForecast } from "@/lib/risk/no-approval-hazards";

export const dynamic = "force-dynamic";

const PROOF_LOCATIONS = [
  { name: "Lokoja", latitude: 7.8023, longitude: 6.7333 },
  { name: "Makurdi", latitude: 7.7337, longitude: 8.5214 },
  { name: "Onitsha", latitude: 6.1462, longitude: 6.8019 },
  { name: "Yenagoa", latitude: 4.9267, longitude: 6.2676 },
  { name: "Hadejia", latitude: 12.4506, longitude: 10.0404 },
] as const;

export async function GET() {
  const startedAt = Date.now();
  const settled = await Promise.allSettled(
    PROOF_LOCATIONS.map((location) =>
      fetchNoApprovalHazardForecast(
        location.latitude,
        location.longitude,
        location.name
      )
    )
  );

  const results = settled.map((result, index) => {
    const location = PROOF_LOCATIONS[index];
    if (result.status === "rejected") {
      return {
        location: location.name,
        ok: false,
        error: result.reason instanceof Error ? result.reason.message : "unknown source error",
      };
    }

    return {
      location: location.name,
      ok: true,
      status: result.value.status,
      headline: result.value.headline,
      primary_hazard: result.value.primary_hazard
        ? {
            kind: result.value.primary_hazard.kind,
            severity: result.value.primary_hazard.severity,
            score: result.value.primary_hazard.score,
            when: result.value.primary_hazard.when,
          }
        : null,
      core_weather: result.value.source_status.core_weather,
      ecmwf_detail: result.value.source_status.ecmwf_detail,
      approval_or_api_key_required:
        result.value.source_status.approval_or_api_key_required,
    };
  });

  const passed = results.filter((result) => result.ok).length;

  return NextResponse.json({
    engine: "no-approval-hazards-v1",
    passed,
    total: PROOF_LOCATIONS.length,
    proof_passed: passed === PROOF_LOCATIONS.length,
    duration_ms: Date.now() - startedAt,
    results,
    generated_at: new Date().toISOString(),
  });
}
