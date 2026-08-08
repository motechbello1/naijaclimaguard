import {
  CanonicalObservation,
  CanonicalVariable,
  GeoPoint,
  QualityStatus,
  SourceKind,
} from "./types";

export interface RawObservationInput {
  sourceKind: SourceKind;
  provider: string;
  sourceId: string;
  variable: string;
  value: number | string | boolean;
  unit?: string;
  observedAt: string | Date;
  receivedAt?: string | Date;
  location: GeoPoint;
  qualityStatus?: QualityStatus;
  confidence?: number;
  flags?: string[];
  sourceVersion?: string;
  externalRecordId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

const VARIABLE_ALIASES: Record<string, CanonicalVariable> = {
  precipitation: "precipitation_mm",
  rainfall: "precipitation_mm",
  precipitation_mm: "precipitation_mm",
  rainfall_intensity: "rainfall_intensity_mm_h",
  rainfall_intensity_mm_h: "rainfall_intensity_mm_h",
  discharge: "river_discharge_m3s",
  river_discharge: "river_discharge_m3s",
  river_discharge_m3s: "river_discharge_m3s",
  water_level: "water_level_m",
  stage: "water_level_m",
  water_level_m: "water_level_m",
  soil_moisture: "soil_moisture_fraction",
  soil_moisture_fraction: "soil_moisture_fraction",
  et0: "evapotranspiration_mm",
  evapotranspiration: "evapotranspiration_mm",
  evapotranspiration_mm: "evapotranspiration_mm",
  flood_observation: "flood_observation",
  advisory_level: "advisory_level",
  dam_release: "dam_release_m3s",
  dam_release_m3s: "dam_release_m3s",
};

function iso(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid observation timestamp");
  return d.toISOString();
}

function assertLocation(location: GeoPoint) {
  if (!Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90) {
    throw new Error("Invalid latitude");
  }
  if (!Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180) {
    throw new Error("Invalid longitude");
  }
}

function canonicalVariable(variable: string): CanonicalVariable {
  const key = variable.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const mapped = VARIABLE_ALIASES[key];
  if (!mapped) throw new Error(`Unsupported observation variable: ${variable}`);
  return mapped;
}

function normalizeNumeric(
  variable: CanonicalVariable,
  value: number,
  unit?: string
): { value: number; unit: string } {
  if (!Number.isFinite(value)) throw new Error("Observation value must be finite");
  const u = (unit || "").trim().toLowerCase().replace("³", "3");

  if (variable === "water_level_m") {
    if (["m", "meter", "metre", "meters", "metres"].includes(u) || !u) return { value, unit: "m" };
    if (["cm", "centimeter", "centimetre", "centimeters", "centimetres"].includes(u)) return { value: value / 100, unit: "m" };
    if (["mm", "millimeter", "millimetre"].includes(u)) return { value: value / 1000, unit: "m" };
    throw new Error(`Unsupported water-level unit: ${unit}`);
  }

  if (variable === "river_discharge_m3s" || variable === "dam_release_m3s") {
    if (["m3/s", "m3s", "m^3/s", "cms", "cumec", "cumecs"].includes(u)) return { value, unit: "m3/s" };
    if (["ft3/s", "ft^3/s", "cfs"].includes(u)) return { value: value * 0.028316846592, unit: "m3/s" };
    throw new Error(`Unsupported discharge unit: ${unit}`);
  }

  if (variable === "precipitation_mm" || variable === "evapotranspiration_mm") {
    if (["mm", "millimeter", "millimetre", "millimeters", "millimetres"].includes(u) || !u) return { value, unit: "mm" };
    if (["cm", "centimeter", "centimetre"].includes(u)) return { value: value * 10, unit: "mm" };
    throw new Error(`Unsupported precipitation/ET unit: ${unit}`);
  }

  if (variable === "rainfall_intensity_mm_h") {
    if (["mm/h", "mm/hr", "mm/hour", "mmh"].includes(u)) return { value, unit: "mm/h" };
    throw new Error(`Unsupported rainfall-intensity unit: ${unit}`);
  }

  if (variable === "soil_moisture_fraction") {
    if (["fraction", "ratio", "m3/m3", "m3m3"].includes(u) || !u) return { value, unit: "fraction" };
    if (["%", "percent", "percentage"].includes(u)) return { value: value / 100, unit: "fraction" };
    throw new Error(`Unsupported soil-moisture unit: ${unit}`);
  }

  return { value, unit: unit || "dimensionless" };
}

export function normalizeObservation(input: RawObservationInput): CanonicalObservation {
  assertLocation(input.location);
  const variable = canonicalVariable(input.variable);
  const observedAt = iso(input.observedAt);
  const receivedAt = iso(input.receivedAt ?? new Date());

  if (input.confidence != null && (input.confidence < 0 || input.confidence > 1)) {
    throw new Error("confidence must be between 0 and 1");
  }

  let value = input.value;
  let unit = input.unit || "dimensionless";

  if (typeof value === "number") {
    const normalized = normalizeNumeric(variable, value, input.unit);
    value = normalized.value;
    unit = normalized.unit;
  } else if (!["flood_observation", "advisory_level"].includes(variable)) {
    throw new Error(`${variable} requires a numeric value`);
  }

  return {
    sourceKind: input.sourceKind,
    variable,
    value,
    unit,
    observedAt,
    receivedAt,
    location: input.location,
    quality: {
      status: input.qualityStatus ?? "unknown",
      confidence: input.confidence,
      flags: input.flags ?? [],
    },
    provenance: {
      provider: input.provider,
      sourceId: input.sourceId,
      sourceVersion: input.sourceVersion,
      externalRecordId: input.externalRecordId,
      retrievedAt: receivedAt,
      originalUnit: input.unit,
      originalVariable: input.variable,
    },
    metadata: input.metadata,
  };
}
