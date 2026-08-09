import { createHash } from "crypto";
import { IntelligenceSourceKind, ObservationQuality, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CanonicalObservation, QualityStatus, SourceKind } from "./types";

const SOURCE_KIND_TO_DB: Record<SourceKind, IntelligenceSourceKind> = {
  satellite: IntelligenceSourceKind.SATELLITE,
  weather: IntelligenceSourceKind.WEATHER,
  hydrological_model: IntelligenceSourceKind.HYDROLOGICAL_MODEL,
  official_gauge: IntelligenceSourceKind.OFFICIAL_GAUGE,
  iot_sensor: IntelligenceSourceKind.IOT_SENSOR,
  dam_operation: IntelligenceSourceKind.DAM_OPERATION,
  citizen_report: IntelligenceSourceKind.CITIZEN_REPORT,
  official_advisory: IntelligenceSourceKind.OFFICIAL_ADVISORY,
};

const QUALITY_TO_DB: Record<QualityStatus, ObservationQuality> = {
  good: ObservationQuality.GOOD,
  suspect: ObservationQuality.SUSPECT,
  stale: ObservationQuality.STALE,
  missing: ObservationQuality.MISSING,
  unknown: ObservationQuality.UNKNOWN,
};

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function observationDedupeKey(observation: CanonicalObservation): string {
  const identity = observation.provenance.externalRecordId
    ? [observation.provenance.provider, observation.provenance.sourceId, observation.provenance.externalRecordId]
    : [
        observation.provenance.provider,
        observation.provenance.sourceId,
        observation.variable,
        observation.observedAt,
        observation.location.latitude.toFixed(6),
        observation.location.longitude.toFixed(6),
        JSON.stringify(observation.value),
      ];
  return createHash("sha256").update(identity.join("|")).digest("hex");
}

export async function registerIntelligenceSource(input: {
  slug: string;
  provider: string;
  name: string;
  sourceKind: SourceKind;
  description?: string;
  defaultFreshnessMinutes: number;
  active?: boolean;
  config?: Record<string, unknown>;
}) {
  if (!input.slug.trim()) throw new Error("source slug is required");
  if (!Number.isFinite(input.defaultFreshnessMinutes) || input.defaultFreshnessMinutes <= 0) throw new Error("defaultFreshnessMinutes must be positive");
  return prisma.intelligenceSource.upsert({
    where: { slug: input.slug },
    update: {
      provider: input.provider,
      name: input.name,
      sourceKind: SOURCE_KIND_TO_DB[input.sourceKind],
      description: input.description,
      defaultFreshnessMinutes: Math.round(input.defaultFreshnessMinutes),
      active: input.active ?? true,
      config: input.config ? jsonValue(input.config) : Prisma.JsonNull,
    },
    create: {
      slug: input.slug,
      provider: input.provider,
      name: input.name,
      sourceKind: SOURCE_KIND_TO_DB[input.sourceKind],
      description: input.description,
      defaultFreshnessMinutes: Math.round(input.defaultFreshnessMinutes),
      active: input.active ?? true,
      config: input.config ? jsonValue(input.config) : Prisma.JsonNull,
    },
  });
}

export async function persistCanonicalObservations(sourceSlug: string, observations: CanonicalObservation[]) {
  const source = await prisma.intelligenceSource.findUnique({ where: { slug: sourceSlug } });
  if (!source) throw new Error(`Unknown intelligence source: ${sourceSlug}`);
  if (!source.active) throw new Error(`Intelligence source is disabled: ${sourceSlug}`);
  const data: Prisma.IntelligenceObservationCreateManyInput[] = observations.map((obs) => ({
    sourceId: source.id,
    variable: obs.variable,
    value: jsonValue(obs.value),
    unit: obs.unit,
    observedAt: new Date(obs.observedAt),
    receivedAt: new Date(obs.receivedAt),
    latitude: obs.location.latitude,
    longitude: obs.location.longitude,
    locationName: obs.location.name,
    state: obs.location.state,
    country: obs.location.country,
    qualityStatus: QUALITY_TO_DB[obs.quality.status],
    confidence: obs.quality.confidence,
    flags: obs.quality.flags?.length ? jsonValue(obs.quality.flags) : Prisma.JsonNull,
    sourceVersion: obs.provenance.sourceVersion,
    externalRecordId: obs.provenance.externalRecordId,
    originalUnit: obs.provenance.originalUnit,
    originalVariable: obs.provenance.originalVariable,
    metadata: obs.metadata ? jsonValue(obs.metadata) : Prisma.JsonNull,
    dedupeKey: observationDedupeKey(obs),
  }));
  if (!data.length) return { attempted: 0, inserted: 0, duplicates: 0 };
  const result = await prisma.intelligenceObservation.createMany({ data, skipDuplicates: true });
  return { attempted: data.length, inserted: result.count, duplicates: data.length - result.count };
}
