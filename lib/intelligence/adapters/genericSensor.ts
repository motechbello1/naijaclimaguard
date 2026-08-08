import { normalizeObservation } from "../normalize";
import { CanonicalObservation, GeoPoint, SourceKind } from "../types";

export interface SensorFieldMap {
  value: string;
  observedAt: string;
  latitude?: string;
  longitude?: string;
  quality?: string;
  externalRecordId?: string;
}

export interface GenericSensorAdapterConfig {
  provider: string;
  sourceId: string;
  sourceKind?: Extract<SourceKind, "official_gauge" | "iot_sensor" | "dam_operation">;
  variable: string;
  unit: string;
  fields: SensorFieldMap;
  fixedLocation?: GeoPoint;
  sourceVersion?: string;
}

function readPath(record: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, record);
}

function required(record: Record<string, unknown>, path: string) {
  const value = readPath(record, path);
  if (value == null || value === "") throw new Error(`Missing sensor field: ${path}`);
  return value;
}

function numeric(value: unknown, field: string) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error(`Sensor field ${field} must be numeric`);
  return n;
}

/**
 * Converts a third-party gauge/IoT JSON record into NaijaClimaGuard's canonical
 * observation contract. No vendor-specific schema is assumed: the integration
 * supplies a field map once, then every record preserves its original provider,
 * source identifier, unit, timestamp and external record ID.
 */
export function adaptGenericSensorRecord(
  record: Record<string, unknown>,
  config: GenericSensorAdapterConfig
): CanonicalObservation {
  const value = numeric(required(record, config.fields.value), config.fields.value);
  const observedAt = String(required(record, config.fields.observedAt));

  const location = config.fixedLocation ?? {
    latitude: numeric(required(record, config.fields.latitude || "latitude"), config.fields.latitude || "latitude"),
    longitude: numeric(required(record, config.fields.longitude || "longitude"), config.fields.longitude || "longitude"),
  };

  const rawQuality = config.fields.quality ? readPath(record, config.fields.quality) : undefined;
  const qualityText = typeof rawQuality === "string" ? rawQuality.toLowerCase() : "unknown";
  const qualityStatus = ["good", "suspect", "stale", "missing"].includes(qualityText)
    ? (qualityText as "good" | "suspect" | "stale" | "missing")
    : "unknown";

  const externalRecordId = config.fields.externalRecordId
    ? readPath(record, config.fields.externalRecordId)
    : undefined;

  return normalizeObservation({
    sourceKind: config.sourceKind ?? "iot_sensor",
    provider: config.provider,
    sourceId: config.sourceId,
    sourceVersion: config.sourceVersion,
    externalRecordId: externalRecordId == null ? undefined : String(externalRecordId),
    variable: config.variable,
    value,
    unit: config.unit,
    observedAt,
    location,
    qualityStatus,
    metadata: {
      adapter: "generic-sensor-v1",
    },
  });
}
