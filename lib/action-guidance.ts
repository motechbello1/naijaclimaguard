export type ExplanationMode = "simple" | "detailed" | "technical";
export type UserRole = "HOUSEHOLD" | "FARMER" | "BUSINESS" | "AGENCY";

export interface ActionGuidanceInput {
  score: number;
  level: string;
  role: UserRole;
  locationName: string;
  model?: string;
  threshold?: number;
}

export interface ActionGuidance {
  headline: string;
  urgency: "monitor" | "prepare" | "act";
  actions: string[];
  simple: string;
  detailed: string;
  technical: string;
}

const normaliseLevel = (score: number, level: string) => {
  const l = (level || "").toUpperCase();
  if (l.includes("CRITICAL") || score >= 80) return "CRITICAL";
  if (l.includes("HIGH") || score >= 60) return "HIGH";
  if (l.includes("MODERATE") || score >= 35) return "MODERATE";
  return "LOW";
};

const roleActions: Record<UserRole, Record<string, string[]>> = {
  HOUSEHOLD: {
    LOW: ["Keep emergency contacts and essential documents easy to reach.", "Continue monitoring official and local flood guidance."],
    MODERATE: ["Check drainage around your home and clear safe blockages.", "Place medicines, documents and chargers where they can be moved quickly.", "Confirm how your household would leave if local authorities advise evacuation."],
    HIGH: ["Move important documents, medicines and electronics above likely water level today.", "Charge phones and power banks and prepare a small emergency bag.", "Tell household members where to meet if you become separated.", "Follow any evacuation instruction from authorised emergency agencies immediately."],
    CRITICAL: ["Prioritise people over property and follow authorised evacuation instructions now.", "Take medicines, identification, water and essential communication devices.", "Avoid walking or driving through floodwater.", "Confirm to family or responders when you reach a safer location."],
  },
  FARMER: {
    LOW: ["Continue normal farm monitoring and keep drainage channels clear where safe."],
    MODERATE: ["Identify livestock, equipment and harvested produce that can be moved quickly.", "Check higher-ground storage and access routes."],
    HIGH: ["Move livestock, machinery and harvested produce from low-lying areas today where safe.", "Protect fertiliser, seed, chemicals and records from water exposure.", "Confirm an alternative route to the farm and avoid sending workers into rising water."],
    CRITICAL: ["Do not put workers or livestock handlers into unsafe floodwater.", "Use the safest available higher ground for animals and portable assets.", "Record affected plots and assets for later recovery or insurance evidence."],
  },
  BUSINESS: {
    LOW: ["Keep your business continuity contacts and critical records current."],
    MODERATE: ["Identify stock, equipment and records located at floor level.", "Review staff contact lists and alternative access routes."],
    HIGH: ["Move vulnerable stock and critical equipment above likely water exposure.", "Notify responsible staff and suppliers of possible disruption.", "Back up essential records and prepare to suspend unsafe site access."],
    CRITICAL: ["Protect staff first and close unsafe access points.", "Activate the business continuity plan and notify key staff and partners.", "Document exposed assets and operational disruption for recovery and insurance."],
  },
  AGENCY: {
    LOW: ["Continue monitoring and maintain routine situational awareness."],
    MODERATE: ["Review local response contacts and known vulnerable communities.", "Check communication and field-reporting readiness."],
    HIGH: ["Review whether pre-positioning or public preparedness messaging is warranted.", "Prioritise vulnerable communities and critical infrastructure for verification.", "Confirm communication coverage and escalation contacts."],
    CRITICAL: ["Escalate for authorised operational review immediately.", "Prioritise life-safety messaging, evacuation support and access-route verification.", "Track warning delivery, acknowledgement and field reports for the incident record."],
  },
};

export function getActionGuidance(input: ActionGuidanceInput): ActionGuidance {
  const risk = normaliseLevel(input.score, input.level);
  const urgency = risk === "CRITICAL" ? "act" : risk === "HIGH" ? "act" : risk === "MODERATE" ? "prepare" : "monitor";
  const actions = roleActions[input.role][risk];
  const headline = risk === "CRITICAL"
    ? `Act now for ${input.locationName}`
    : risk === "HIGH"
      ? `Prepare now for ${input.locationName}`
      : risk === "MODERATE"
        ? `Get ready in ${input.locationName}`
        : `Keep watching ${input.locationName}`;

  return {
    headline,
    urgency,
    actions,
    simple: risk === "LOW"
      ? `Flood risk is currently low for ${input.locationName}. Keep monitoring.`
      : risk === "MODERATE"
        ? `Flood risk is increasing for ${input.locationName}. Prepare now so you can move quickly if conditions worsen.`
        : risk === "HIGH"
          ? `Flood risk is high for ${input.locationName}. Take the recommended protective actions now and watch for official instructions.`
          : `Flood risk is critical for ${input.locationName}. Prioritise safety and follow authorised emergency instructions immediately.`,
    detailed: `NaijaClimaGuard currently classifies ${input.locationName} as ${risk} risk with a live risk index of ${Math.round(input.score)}/100. This is a decision-support signal: combine it with official NiHSA/NEMA/state guidance and verified local observations. The actions below are tailored to the selected user type.`,
    technical: `Risk index=${input.score.toFixed(1)}/100; level=${risk}; model=${input.model || "current disclosed production engine"}${input.threshold !== undefined ? `; alert threshold=${input.threshold}` : ""}. Guidance is a deterministic presentation layer and does not alter the underlying model output.`,
  };
}
