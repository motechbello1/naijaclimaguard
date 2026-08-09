export type ExplanationMode = "simple" | "detailed" | "technical";
export type UserRole = "HOUSEHOLD" | "FARMER" | "BUSINESS" | "AGENCY";
export type AssetType =
  | "HOME"
  | "FARM"
  | "BUSINESS_PREMISES"
  | "WAREHOUSE"
  | "SCHOOL"
  | "INSURED_PROPERTY"
  | "GOVERNMENT_FACILITY"
  | "OTHER";

export interface ActionGuidanceInput {
  score: number;
  level: string;
  role: UserRole;
  locationName: string;
  assetType?: AssetType;
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

export const ASSET_LABELS: Record<AssetType, string> = {
  HOME: "Home",
  FARM: "Farm",
  BUSINESS_PREMISES: "Business premises",
  WAREHOUSE: "Warehouse",
  SCHOOL: "School",
  INSURED_PROPERTY: "Insured property",
  GOVERNMENT_FACILITY: "Government facility",
  OTHER: "Other asset",
};

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

const assetActions: Record<AssetType, Partial<Record<string, string[]>>> = {
  HOME: {
    MODERATE: ["Check the safest exit route from this home and where household members would regroup."],
    HIGH: ["Move vulnerable household items from low floors where this can be done safely."],
    CRITICAL: ["Do not remain in this property solely to protect belongings if authorities advise evacuation."],
  },
  FARM: {
    MODERATE: ["Identify the lowest plots, animal pens and storage areas attached to this farm."],
    HIGH: ["Prioritise movable livestock, inputs and harvested produce in the lowest parts of this farm."],
    CRITICAL: ["Record affected plots, livestock areas and stored inputs for recovery evidence when safe."],
  },
  BUSINESS_PREMISES: {
    MODERATE: ["Identify customer, staff and equipment areas that would be disrupted first at this premises."],
    HIGH: ["Prepare a controlled shutdown and staff notification plan for this premises."],
    CRITICAL: ["Suspend unsafe access and preserve business interruption records when safe."],
  },
  WAREHOUSE: {
    MODERATE: ["Identify floor-level stock, electrical equipment and loading access most exposed at this warehouse."],
    HIGH: ["Move high-value or water-sensitive stock upward or to a safer facility where feasible."],
    CRITICAL: ["Protect staff first; document exposed inventory and blocked access for recovery or insurance."],
  },
  SCHOOL: {
    MODERATE: ["Review pupil, staff and guardian contact procedures and safe assembly points for this school."],
    HIGH: ["Prepare authorised parent/guardian messaging and review whether activities should be moved or suspended."],
    CRITICAL: ["Follow authorised closure or evacuation procedures and account for pupils and staff."],
  },
  INSURED_PROPERTY: {
    MODERATE: ["Check policy records, insured values and current photographs for this property."],
    HIGH: ["Preserve time-stamped evidence of the property condition and protect movable insured assets where safe."],
    CRITICAL: ["Prioritise safety, then document damage and disruption for claims handling when conditions allow."],
  },
  GOVERNMENT_FACILITY: {
    MODERATE: ["Review continuity contacts, critical services and public access dependencies for this facility."],
    HIGH: ["Prepare continuity measures and verify communications with the responsible authority."],
    CRITICAL: ["Escalate through the authorised command chain and preserve an incident record of decisions and service disruption."],
  },
  OTHER: {},
};

export function getActionGuidance(input: ActionGuidanceInput): ActionGuidance {
  const risk = normaliseLevel(input.score, input.level);
  const urgency = risk === "CRITICAL" || risk === "HIGH" ? "act" : risk === "MODERATE" ? "prepare" : "monitor";
  const assetType = input.assetType || "OTHER";
  const assetLabel = ASSET_LABELS[assetType];
  const actions = [...roleActions[input.role][risk], ...(assetActions[assetType][risk] || [])];
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
      ? `Flood risk is currently low for this ${assetLabel.toLowerCase()} in ${input.locationName}. Keep monitoring.`
      : risk === "MODERATE"
        ? `Flood risk is increasing around this ${assetLabel.toLowerCase()} in ${input.locationName}. Prepare now so you can move quickly if conditions worsen.`
        : risk === "HIGH"
          ? `Flood risk is high around this ${assetLabel.toLowerCase()} in ${input.locationName}. Take the recommended protective actions now and watch for official instructions.`
          : `Flood risk is critical around this ${assetLabel.toLowerCase()} in ${input.locationName}. Prioritise safety and follow authorised emergency instructions immediately.`,
    detailed: `NaijaClimaGuard currently classifies ${input.locationName} as ${risk} risk with a live risk index of ${Math.round(input.score)}/100. This saved point is being treated as ${assetLabel.toLowerCase()}, so the actions combine the selected user role with asset-specific preparedness. Use this decision-support signal alongside official NiHSA/NEMA/state guidance and verified local observations.`,
    technical: `Risk index=${input.score.toFixed(1)}/100; level=${risk}; asset_type=${assetType}; role=${input.role}; model=${input.model || "current disclosed production engine"}${input.threshold !== undefined ? `; alert threshold=${input.threshold}` : ""}. Guidance is a deterministic presentation layer and does not alter the underlying model output.`,
  };
}
