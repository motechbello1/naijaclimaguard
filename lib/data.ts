export const RISK_LEVELS = {
  LOW: { label: "Low", color: "#10B981", bg: "#10B98122" },
  MODERATE: { label: "Moderate", color: "#F59E0B", bg: "#F59E0B22" },
  HIGH: { label: "High", color: "#F97316", bg: "#F9731622" },
  EXTREME: { label: "Extreme", color: "#EF4444", bg: "#EF444422" },
} as const;

export function getRiskLevel(score: number) {
  if (score <= 25) return RISK_LEVELS.LOW;
  if (score <= 50) return RISK_LEVELS.MODERATE;
  if (score <= 75) return RISK_LEVELS.HIGH;
  return RISK_LEVELS.EXTREME;
}

/**
 * Public historical milestones only. This is intentionally not presented as a
 * NaijaClimaGuard prediction timeline. Validation v2 reconstructs what data and
 * forecasts were actually available at T-72/T-48/T-24 before any lead-time
 * claim is published.
 */
export const LOKOJA_TIMELINE = [
  {
    date: "Sep 13, 2022",
    event: "Upstream Lagdo release period begins",
    type: "prediction" as const,
    detail: "An upstream hydrological milestone used in the ongoing historical reconstruction; not a NaijaClimaGuard prediction.",
    score: "UP",
  },
  {
    date: "Sep 28, 2022",
    event: "Flooding already documented in Lokoja communities",
    type: "disaster" as const,
    detail: "Public reporting documented submerged homes, roads, and farmland in Lokoja before the previously published Oct 5–9 website timeline.",
    score: "OBS",
  },
  {
    date: "Oct 1, 2022",
    event: "Kogi authorities describe active flood response",
    type: "government" as const,
    detail: "State reporting cited earlier NiHSA/NiMet predictions and evacuation messaging. This is why the former '48 hours before government' claim has been withdrawn.",
    score: "GOV",
  },
  {
    date: "Oct 6, 2022",
    event: "NiHSA-recorded Lokoja hydrological peak",
    type: "government" as const,
    detail: "NiHSA's 2023 Annual Flood Outlook reports a 2022 maximum discharge of about 25,424 m³/s at Lokoja on Oct 6.",
    score: "Q",
  },
];

export const PRICING = [
  {
    name: "Explorer", price: "Free", period: "", description: "For researchers & individuals",
    features: ["Saved locations", "Public My Area risk check", "Dashboard access", "Current risk monitoring", "Email alert rules"],
    cta: "Start Free", highlighted: false,
  },
  {
    name: "Professional", price: "₦15,000", period: "/month", description: "For agribusiness, insurers & NGOs",
    features: ["Expanded location monitoring", "Dashboard risk views", "REST API access", "Email alert rules", "Downloadable situation reports", "Historical views"],
    cta: "Choose Professional", highlighted: true,
  },
  {
    name: "Enterprise", price: "Scoped", period: "", description: "For agencies, banks, telcos & institutional pilots",
    features: ["Controlled pilot scoping", "Selected-location workflow evaluation", "API and data integration planning", "Institutional reporting and evidence review", "Delivery-channel integration planning", "Technical onboarding and pilot close-out"],
    cta: "Discuss a Pilot", highlighted: false,
  },
];

export const API_EXAMPLE = {
  request: `curl "https://naijaclimaguard.vercel.app/api/v1/risk?latitude=7.8023&longitude=6.7333"`,
  response: `{
  "risk": {
    "score": 57,
    "level": "WATCH",
    "flood_type": "mixed"
  },
  "factors": {
    "rainfall_7d": 0.42,
    "burst_intensity": 0.51,
    "soil_saturation": 0.38
  },
  "hourly": {
    "max_mm_per_hour": 8.4,
    "max_3h_mm": 19.7,
    "classification": "light"
  },
  "meta": {
    "model": "derived-v2",
    "data_source": "Open-Meteo forecast API · daily + hourly"
  }
}`,
};