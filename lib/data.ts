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

export const LOKOJA_TIMELINE = [
  { date: "Oct 5, 2022", event: "Anomalous rainfall accumulation detected upstream", type: "prediction" as const, detail: "ML model flags Kogi State risk at 78/100", score: 78 },
  { date: "Oct 6, 2022", event: "Risk escalates to EXTREME — 92/100", type: "prediction" as const, detail: "GloFAS confirms Niger-Benue confluence surge pattern", score: 92 },
  { date: "Oct 7, 2022", event: "NEMA issues official flood advisory", type: "government" as const, detail: "Government advisory — 48 hours after our detection", score: 92 },
  { date: "Oct 9, 2022", event: "Catastrophic flooding hits Lokoja", type: "disaster" as const, detail: "1.4 million people affected across Kogi, Anambra, Bayelsa, Delta", score: 95 },
];

export const PRICING = [
  {
    name: "Explorer", price: "Free", period: "", description: "For researchers & individuals",
    features: ["3 locations", "Daily updates", "7-day forecast", "National risk map", "Email alerts"],
    cta: "Start Free", highlighted: false,
  },
  {
    name: "Professional", price: "₦15,000", period: "/month", description: "For agribusiness, insurers & NGOs",
    features: ["50 locations", "Hourly updates", "72-hour forecast", "Full API (10K calls/mo)", "SMS + Email + Webhook", "PDF risk reports", "Historical data"],
    cta: "Start 14-Day Trial", highlighted: true,
  },
  {
    name: "Enterprise", price: "Custom", period: "", description: "For banks, government & reinsurers",
    features: ["Unlimited locations", "Real-time streaming", "Custom models", "Unlimited API", "Dedicated SLA", "Custom integrations", "Compliance reports", "On-premise option"],
    cta: "Contact Sales", highlighted: false,
  },
];

export const API_EXAMPLE = {
  request: `curl -X GET "https://api.naijaclimaguard.com/v1/risk" \\
  -H "Authorization: Bearer ncg_sk_live_..." \\
  -d '{"latitude": 7.7337, "longitude": 6.6906}'`,
  response: `{
  "location": { "state": "Kogi", "lga": "Lokoja" },
  "risk_assessment": {
    "current_score": 67,
    "level": "HIGH",
    "confidence": 0.94,
    "trend": "RISING"
  },
  "forecast": [
    { "hour": 24, "score": 72, "level": "HIGH" },
    { "hour": 48, "score": 79, "level": "EXTREME" }
  ],
  "model": { "version": "2.1.0", "roc_auc": 0.9928 }
}`,
};