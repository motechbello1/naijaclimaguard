export type SourceState = "LIVE" | "VALIDATING" | "ADAPTER_READY" | "NOT_CONNECTED";

export interface IntelligenceSource {
  id: string;
  name: string;
  state: SourceState;
  purpose: string;
  coverage: string;
  authority?: string;
  canOverrideModel?: boolean;
}

/**
 * Product source registry.
 *
 * This is intentionally conservative: a source is marked LIVE only when the
 * current product already receives that stream. "ADAPTER_READY" means the
 * product architecture can accept the signal once an authoritative feed or
 * partner endpoint is configured; it does not pretend that data is present.
 */
export const INTELLIGENCE_SOURCES: IntelligenceSource[] = [
  {
    id: "rainfall",
    name: "Rainfall & weather",
    state: "LIVE",
    purpose: "Current rainfall intensity and recent accumulation used by the disclosed production risk engine.",
    coverage: "Location checks where the Open-Meteo feed is available",
    authority: "Open-Meteo inputs",
  },
  {
    id: "community",
    name: "Community flood observations",
    state: "LIVE",
    purpose: "Ground reports of visible flooding, kept separate from model labels until verified.",
    coverage: "User-submitted reports",
    authority: "Community / operator verification",
  },
  {
    id: "glofas",
    name: "River discharge forecasts",
    state: "VALIDATING",
    purpose: "Archived-operational GloFAS +24/+48/+72 discharge signals being validated in Model v5 before any production promotion.",
    coverage: "Five Model v5 pilot locations during validation",
    authority: "Copernicus CEMS GloFAS",
  },
  {
    id: "gauges",
    name: "Local river gauges & IoT water-level sensors",
    state: "ADAPTER_READY",
    purpose: "Direct local water-level observations for corroboration and faster escalation.",
    coverage: "Requires NiHSA/partner gauge access or registered third-party sensors",
    authority: "NiHSA / approved sensor operators",
  },
  {
    id: "official",
    name: "Official emergency advisories",
    state: "ADAPTER_READY",
    purpose: "Authoritative warnings can supersede a low model score in the user-facing safety state.",
    coverage: "Requires an authorised NiHSA/NEMA/SEMA/NiMet feed or operator workflow",
    authority: "Authorised Nigerian agencies",
    canOverrideModel: true,
  },
  {
    id: "dams",
    name: "Dam & reservoir operations",
    state: "ADAPTER_READY",
    purpose: "Upstream release notices and reservoir operations can raise downstream preparedness independently of local rainfall.",
    coverage: "Requires operator/agency release feed",
    authority: "Dam operators / authorised agencies",
  },
  {
    id: "drainage",
    name: "Drainage & terrain susceptibility",
    state: "NOT_CONNECTED",
    purpose: "Local drainage capacity, terrain and exposure layers for urban and neighbourhood flood susceptibility.",
    coverage: "Planned geospatial layer; not yet used by production scoring",
  },
  {
    id: "tides",
    name: "Coastal tide & surge context",
    state: "NOT_CONNECTED",
    purpose: "Coastal water-level context for locations where rainfall alone cannot explain flood risk.",
    coverage: "Planned for relevant coastal assets; not yet used by production scoring",
  },
];

export function sourceStateLabel(state: SourceState) {
  if (state === "LIVE") return "Live";
  if (state === "VALIDATING") return "Under validation";
  if (state === "ADAPTER_READY") return "Integration ready";
  return "Not connected yet";
}
