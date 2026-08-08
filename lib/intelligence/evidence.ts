import {
  CanonicalObservation,
  EvidenceSnapshot,
  GeoPoint,
  SourceHealth,
  SourceKind,
} from "./types";

const DEFAULT_MAX_AGE_MINUTES: Record<SourceKind, number> = {
  satellite: 360,
  weather: 180,
  hydrological_model: 720,
  official_gauge: 180,
  iot_sensor: 60,
  dam_operation: 360,
  citizen_report: 360,
  official_advisory: 720,
};

function minutesOld(iso: string, now: Date) {
  return Math.max(0, (now.getTime() - new Date(iso).getTime()) / 60000);
}

function latestBySource(observations: CanonicalObservation[]) {
  const latest = new Map<string, CanonicalObservation>();
  for (const obs of observations) {
    const key = `${obs.provenance.provider}:${obs.provenance.sourceId}`;
    const current = latest.get(key);
    if (!current || new Date(obs.observedAt) > new Date(current.observedAt)) latest.set(key, obs);
  }
  return [...latest.values()];
}

export function buildSourceHealth(
  observations: CanonicalObservation[],
  now = new Date(),
  maxAgeMinutes: Partial<Record<SourceKind, number>> = {}
): SourceHealth[] {
  return latestBySource(observations).map((obs) => {
    const ageMinutes = minutesOld(obs.observedAt, now);
    const limit = maxAgeMinutes[obs.sourceKind] ?? DEFAULT_MAX_AGE_MINUTES[obs.sourceKind];

    if (obs.quality.status === "missing") {
      return {
        sourceId: obs.provenance.sourceId,
        provider: obs.provenance.provider,
        sourceKind: obs.sourceKind,
        status: "missing",
        lastObservedAt: obs.observedAt,
        ageMinutes: Math.round(ageMinutes),
        reason: "source marked observation as missing",
      };
    }

    if (obs.quality.status === "suspect") {
      return {
        sourceId: obs.provenance.sourceId,
        provider: obs.provenance.provider,
        sourceKind: obs.sourceKind,
        status: "suspect",
        lastObservedAt: obs.observedAt,
        ageMinutes: Math.round(ageMinutes),
        reason: obs.quality.flags?.join(", ") || "source quality marked suspect",
      };
    }

    if (ageMinutes > limit || obs.quality.status === "stale") {
      return {
        sourceId: obs.provenance.sourceId,
        provider: obs.provenance.provider,
        sourceKind: obs.sourceKind,
        status: "stale",
        lastObservedAt: obs.observedAt,
        ageMinutes: Math.round(ageMinutes),
        reason: `latest observation exceeds ${limit}-minute freshness window`,
      };
    }

    return {
      sourceId: obs.provenance.sourceId,
      provider: obs.provenance.provider,
      sourceKind: obs.sourceKind,
      status: "fresh",
      lastObservedAt: obs.observedAt,
      ageMinutes: Math.round(ageMinutes),
    };
  });
}

function sameLocation(a: GeoPoint, b: GeoPoint, tolerance = 0.2) {
  return Math.abs(a.latitude - b.latitude) <= tolerance && Math.abs(a.longitude - b.longitude) <= tolerance;
}

export function buildEvidenceSnapshot(
  location: GeoPoint,
  allObservations: CanonicalObservation[],
  now = new Date()
): EvidenceSnapshot {
  const observations = allObservations.filter((obs) => sameLocation(location, obs.location));
  const sourceHealth = buildSourceHealth(observations, now);

  const rainfall = observations.filter((obs) =>
    ["precipitation_mm", "rainfall_intensity_mm_h", "evapotranspiration_mm", "soil_moisture_fraction"].includes(obs.variable)
  );
  const hydrology = observations.filter((obs) =>
    ["river_discharge_m3s", "water_level_m", "dam_release_m3s"].includes(obs.variable)
  );
  const ground = observations.filter((obs) =>
    ["official_gauge", "iot_sensor", "citizen_report"].includes(obs.sourceKind)
  );
  const operational = observations.filter((obs) =>
    ["official_advisory", "dam_operation"].includes(obs.sourceKind)
  );

  const families = [rainfall, hydrology, ground, operational].filter((x) => x.length > 0).length;

  return {
    location,
    generatedAt: now.toISOString(),
    observations,
    sourceHealth,
    evidenceByFamily: { rainfall, hydrology, ground, operational },
    summary: {
      freshSourceCount: sourceHealth.filter((s) => s.status === "fresh").length,
      staleSourceCount: sourceHealth.filter((s) => s.status === "stale").length,
      suspectSourceCount: sourceHealth.filter((s) => s.status === "suspect").length,
      representedFamilies: families,
    },
    decisionStatus: "evidence_only",
    note:
      "This snapshot describes source availability and evidence provenance only. It does not assign a flood probability or warning level until a validated decision model/policy is attached.",
  };
}
