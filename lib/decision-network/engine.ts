export type DecisionRole = "HOUSEHOLD" | "FARMER" | "BUSINESS" | "AGENCY";
export type SourceHealth = "fresh" | "stale" | "suspect" | "missing" | "restricted";
export type SourceKind = "official" | "gauge" | "forecast" | "satellite" | "weather" | "citizen" | "model" | "other";

export type SourceSignal = {
  id: string;
  name: string;
  kind: SourceKind;
  health: SourceHealth;
  ageMinutes?: number | null;
  authority?: string | null;
  detail?: string | null;
};

export type TrustAssessment = {
  score: number;
  band: "strong" | "usable" | "degraded" | "insufficient";
  freshSources: number;
  degradedSources: number;
  authoritativeWarning: boolean;
  conflict: boolean;
  explanation: string;
};

export type ImpactAsset = {
  id: string;
  name: string;
  category: string;
  criticality: number;
  vulnerability: number;
  recoveryDifficulty: number;
  enabled: boolean;
};

export type ImpactNode = ImpactAsset & {
  exposureScore: number;
  priority: "critical" | "high" | "moderate" | "watch";
};

export type DecisionAction = {
  code: string;
  timeframe: "now" | "next" | "worsen" | "after";
  label: string;
  why: string;
  priority: number;
};

const KIND_WEIGHT: Record<SourceKind, number> = {
  official: 1,
  gauge: 0.92,
  forecast: 0.82,
  satellite: 0.78,
  weather: 0.7,
  model: 0.66,
  citizen: 0.5,
  other: 0.45,
};

const HEALTH_WEIGHT: Record<SourceHealth, number> = {
  fresh: 1,
  stale: 0.55,
  suspect: 0.35,
  missing: 0,
  restricted: 0,
};

export function assessSourceTrust(sources: SourceSignal[]): TrustAssessment {
  const visible = sources.filter((s) => s.health !== "restricted");
  const usable = visible.filter((s) => s.health !== "missing");
  const numerator = usable.reduce((sum, source) => sum + KIND_WEIGHT[source.kind] * HEALTH_WEIGHT[source.health], 0);
  const denominator = usable.reduce((sum, source) => sum + KIND_WEIGHT[source.kind], 0);
  const score = denominator ? Math.round((numerator / denominator) * 100) : 0;
  const freshSources = visible.filter((s) => s.health === "fresh").length;
  const degradedSources = visible.filter((s) => ["stale", "suspect", "missing"].includes(s.health)).length;
  const authoritativeWarning = sources.some((s) => s.kind === "official" && s.health === "fresh");

  const freshOfficial = sources.some((s) => s.kind === "official" && s.health === "fresh");
  const freshNonOfficial = sources.filter((s) => s.kind !== "official" && s.health === "fresh");
  const conflict = freshOfficial && freshNonOfficial.length > 0;
  const band = score >= 80 ? "strong" : score >= 60 ? "usable" : score >= 35 ? "degraded" : "insufficient";

  const explanation = authoritativeWarning
    ? "A fresh official advisory is present. It remains operationally authoritative even when predictive sources disagree."
    : band === "strong"
      ? "Most visible evidence sources are fresh and internally usable. This is source-confidence, not flood probability."
      : band === "usable"
        ? "Enough evidence is fresh to support a decision, but degraded or unavailable feeds should remain visible."
        : band === "degraded"
          ? "Important source gaps exist. Treat the decision state as degraded rather than interpreting missing data as safe."
          : "There is not enough fresh source evidence to present a confident multi-source state.";

  return { score, band, freshSources, degradedSources, authoritativeWarning, conflict, explanation };
}

export function computeImpactGraph(assets: ImpactAsset[], decisionScore: number, officialWarning: boolean): ImpactNode[] {
  const hazard = Math.max(0, Math.min(100, decisionScore)) / 100;
  const officialFactor = officialWarning ? 1.12 : 1;
  return assets
    .filter((asset) => asset.enabled)
    .map((asset) => {
      const severity = (asset.criticality * 0.45 + asset.vulnerability * 0.35 + asset.recoveryDifficulty * 0.2) / 5;
      const exposureScore = Math.min(100, Math.round(hazard * severity * officialFactor * 100));
      const priority = exposureScore >= 75 ? "critical" : exposureScore >= 55 ? "high" : exposureScore >= 30 ? "moderate" : "watch";
      return { ...asset, exposureScore, priority };
    })
    .sort((a, b) => b.exposureScore - a.exposureScore);
}

const ROLE_ACTIONS: Record<DecisionRole, DecisionAction[]> = {
  HOUSEHOLD: [
    { code: "household_people_first", timeframe: "now", label: "Confirm who needs help first", why: "Children, older people and people with mobility/medical needs should be prioritised before property.", priority: 100 },
    { code: "household_essentials", timeframe: "next", label: "Move medicines, documents and charged power higher", why: "These are high-impact, portable assets that are difficult to replace during disruption.", priority: 82 },
    { code: "household_authority", timeframe: "worsen", label: "Follow authority relocation or evacuation instructions", why: "An official warning overrides a low application score and any simulated plan.", priority: 120 },
  ],
  FARMER: [
    { code: "farmer_livestock", timeframe: "now", label: "Confirm livestock movement responsibility", why: "Livestock movement requires lead time and should not begin after access routes are already unsafe.", priority: 100 },
    { code: "farmer_inputs", timeframe: "next", label: "Protect seed, feed, chemicals, records and movable equipment", why: "These assets can create long recovery delays if damaged even when the field itself recovers.", priority: 84 },
    { code: "farmer_stop_work", timeframe: "worsen", label: "Stop work requiring flooded-road or field crossings", why: "People take priority over farm asset protection when conditions worsen.", priority: 115 },
  ],
  BUSINESS: [
    { code: "business_owner", timeframe: "now", label: "Assign the continuity decision owner", why: "A named owner prevents warning information from sitting on a dashboard without an operational response.", priority: 100 },
    { code: "business_stock_data", timeframe: "next", label: "Protect critical stock, records and digital continuity", why: "Business losses often propagate through inventory, data, power and supplier dependencies.", priority: 86 },
    { code: "business_staff", timeframe: "worsen", label: "Suspend unsafe travel and prioritise staff safety", why: "Continuity plans must never require staff to travel through dangerous conditions.", priority: 118 },
  ],
  AGENCY: [
    { code: "agency_verify", timeframe: "now", label: "Verify authority, freshness and missing feeds", why: "Operational action should distinguish authoritative warnings from predictive and community evidence.", priority: 100 },
    { code: "agency_assign", timeframe: "next", label: "Assign ownership, target population and delivery channels", why: "A warning is not operational until responsibility and delivery are explicit.", priority: 88 },
    { code: "agency_close_loop", timeframe: "after", label: "Reconcile delivery, acknowledgement and verified ground outcome", why: "Post-event evidence is required to learn from misses, false alarms and failed delivery.", priority: 110 },
  ],
};

export function compileDecisionActions(role: DecisionRole, impact: ImpactNode[], trust: TrustAssessment, officialWarning: boolean): DecisionAction[] {
  const highestExposure = impact[0]?.exposureScore ?? 0;
  const actions = ROLE_ACTIONS[role].map((action) => ({ ...action }));
  if (highestExposure >= 60) {
    actions.push({
      code: "impact_top_asset",
      timeframe: "now",
      label: `Protect highest-priority exposure: ${impact[0]?.name ?? "critical asset"}`,
      why: `Its scenario exposure score is ${highestExposure}/100 based on the current hazard state and your vulnerability settings. This is not a probability.`,
      priority: 105,
    });
  }
  if (trust.band === "degraded" || trust.band === "insufficient") {
    actions.push({
      code: "source_degraded",
      timeframe: "now",
      label: "Treat missing or stale feeds as uncertainty, not safety",
      why: trust.explanation,
      priority: 112,
    });
  }
  if (officialWarning) {
    actions.push({
      code: "official_override",
      timeframe: "now",
      label: "Official instruction takes priority",
      why: "The source-trust policy never allows a model or user profile to suppress a fresh official warning.",
      priority: 140,
    });
  }
  return actions.sort((a, b) => b.priority - a.priority);
}

export const DEFAULT_ASSETS: Record<DecisionRole, ImpactAsset[]> = {
  HOUSEHOLD: [
    { id: "people", name: "People needing assistance", category: "people", criticality: 5, vulnerability: 5, recoveryDifficulty: 5, enabled: true },
    { id: "medicine", name: "Medicines & documents", category: "essentials", criticality: 5, vulnerability: 4, recoveryDifficulty: 4, enabled: true },
    { id: "power", name: "Phone & backup power", category: "communications", criticality: 4, vulnerability: 3, recoveryDifficulty: 3, enabled: true },
    { id: "property", name: "Movable household valuables", category: "property", criticality: 3, vulnerability: 4, recoveryDifficulty: 3, enabled: true },
  ],
  FARMER: [
    { id: "livestock", name: "Livestock", category: "living assets", criticality: 5, vulnerability: 5, recoveryDifficulty: 5, enabled: true },
    { id: "workers", name: "Farm workers", category: "people", criticality: 5, vulnerability: 4, recoveryDifficulty: 5, enabled: true },
    { id: "inputs", name: "Seed, feed & farm inputs", category: "inputs", criticality: 4, vulnerability: 5, recoveryDifficulty: 4, enabled: true },
    { id: "equipment", name: "Movable equipment & records", category: "equipment", criticality: 4, vulnerability: 4, recoveryDifficulty: 4, enabled: true },
  ],
  BUSINESS: [
    { id: "staff", name: "Staff & visitors", category: "people", criticality: 5, vulnerability: 4, recoveryDifficulty: 5, enabled: true },
    { id: "inventory", name: "Critical inventory", category: "inventory", criticality: 5, vulnerability: 5, recoveryDifficulty: 4, enabled: true },
    { id: "systems", name: "Servers, records & power", category: "operations", criticality: 5, vulnerability: 4, recoveryDifficulty: 5, enabled: true },
    { id: "supply", name: "Supplier & access dependencies", category: "dependencies", criticality: 4, vulnerability: 4, recoveryDifficulty: 5, enabled: true },
  ],
  AGENCY: [
    { id: "communities", name: "Priority communities", category: "population", criticality: 5, vulnerability: 5, recoveryDifficulty: 5, enabled: true },
    { id: "facilities", name: "Critical facilities", category: "infrastructure", criticality: 5, vulnerability: 4, recoveryDifficulty: 5, enabled: true },
    { id: "delivery", name: "Warning delivery capacity", category: "communications", criticality: 5, vulnerability: 4, recoveryDifficulty: 4, enabled: true },
    { id: "responders", name: "Responder access & resources", category: "operations", criticality: 5, vulnerability: 4, recoveryDifficulty: 5, enabled: true },
  ],
};
