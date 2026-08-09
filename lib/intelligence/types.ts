export type SourceKind =
  | "satellite"
  | "weather"
  | "hydrological_model"
  | "official_gauge"
  | "iot_sensor"
  | "dam_operation"
  | "citizen_report"
  | "official_advisory";

export type CanonicalVariable =
  | "precipitation_mm"
  | "rainfall_intensity_mm_h"
  | "river_discharge_m3s"
  | "water_level_m"
  | "soil_moisture_fraction"
  | "evapotranspiration_mm"
  | "flood_observation"
  | "advisory_level"
  | "dam_release_m3s";

export type QualityStatus = "good" | "suspect" | "stale" | "missing" | "unknown";

export interface GeoPoint {
  latitude: number;
  longitude: number;
  name?: string;
  state?: string;
  country?: string;
}

export interface ObservationQuality {
  status: QualityStatus;
  confidence?: number;
  flags?: string[];
}

export interface ObservationProvenance {
  provider: string;
  sourceId: string;
  sourceVersion?: string;
  externalRecordId?: string;
  retrievedAt: string;
  originalUnit?: string;
  originalVariable?: string;
}

export interface CanonicalObservation {
  sourceKind: SourceKind;
  variable: CanonicalVariable;
  value: number | string | boolean;
  unit: string;
  observedAt: string;
  receivedAt: string;
  location: GeoPoint;
  quality: ObservationQuality;
  provenance: ObservationProvenance;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface SourceHealth {
  sourceId: string;
  provider: string;
  sourceKind: SourceKind;
  status: "fresh" | "stale" | "suspect" | "missing";
  lastObservedAt?: string;
  ageMinutes?: number;
  reason?: string;
}

export interface EvidenceSnapshot {
  location: GeoPoint;
  generatedAt: string;
  observations: CanonicalObservation[];
  sourceHealth: SourceHealth[];
  evidenceByFamily: {
    rainfall: CanonicalObservation[];
    hydrology: CanonicalObservation[];
    ground: CanonicalObservation[];
    operational: CanonicalObservation[];
  };
  summary: {
    freshSourceCount: number;
    staleSourceCount: number;
    suspectSourceCount: number;
    representedFamilies: number;
  };
  decisionStatus: "evidence_only";
  note: string;
}
