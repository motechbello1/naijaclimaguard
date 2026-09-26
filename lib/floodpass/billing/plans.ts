/**
 * FloodPass plans. The promise that never changes: warnings and FloodPass
 * proof are free forever, and paying never gets anyone a warning earlier.
 * Plans only add extras that cost us money to run (calls, more places,
 * photo storage) or that save the buyer money (address checks).
 *
 * Paystack takes NGN (and USD for approved Nigerian merchants), not pounds,
 * so the diaspora plan is priced in naira and paid with any international card.
 */

export type PlanFamily = "FREE" | "FAMILY_PLUS" | "DIASPORA" | "FARMER" | "ADDRESS" | "PROTECT";

export type Plan = {
  code: string;
  family: PlanFamily;
  name: string;
  priceLabel: string;
  amountKobo: number;
  /** Days of access one payment gives. 0 = a one-time product, not access. */
  periodDays: number;
  /** Paystack interval for a repeating plan; null = pay once. */
  interval: "weekly" | "monthly" | null;
  /** Setting that holds the Paystack plan code (PLN_...), for automatic renewal. */
  paystackPlanEnv?: string;
  status: "live" | "waitlist";
  who: string;
  gets: string[];
};

export const PLANS: Plan[] = [
  {
    code: "family_plus_monthly",
    family: "FAMILY_PLUS",
    name: "Family Plus",
    priceLabel: "N500 a month",
    amountKobo: 50_000,
    periodDays: 30,
    interval: "monthly",
    paystackPlanEnv: "PAYSTACK_PLAN_FAMILY_MONTHLY",
    status: "live",
    who: "Families",
    gets: ["Watch up to 5 places", "A phone call at night when danger is close", "SAFE: tell up to 5 family numbers you are safe", "Photo vault for proof of your things"],
  },
  {
    code: "family_plus_weekly",
    family: "FAMILY_PLUS",
    name: "Family Plus (weekly)",
    priceLabel: "N150 a week",
    amountKobo: 15_000,
    periodDays: 7,
    interval: "weekly",
    paystackPlanEnv: "PAYSTACK_PLAN_FAMILY_WEEKLY",
    status: "live",
    who: "Families who prefer small payments",
    gets: ["Everything in Family Plus, paid weekly"],
  },
  {
    code: "diaspora_guardian",
    family: "DIASPORA",
    name: "Diaspora Guardian",
    priceLabel: "N5,000 a month (any international card)",
    amountKobo: 500_000,
    periodDays: 30,
    interval: "monthly",
    paystackPlanEnv: "PAYSTACK_PLAN_DIASPORA_MONTHLY",
    status: "live",
    who: "Nigerians abroad",
    gets: ["Watch your parents' home and up to 5 places", "We phone them when danger is close", "You get their SAFE message wherever you are"],
  },
  {
    code: "farmer_season",
    family: "FARMER",
    name: "Farmer Season Pass",
    priceLabel: "N3,000 for 6 months",
    amountKobo: 300_000,
    periodDays: 183,
    interval: null,
    status: "live",
    who: "Farmers",
    gets: ["Watch your farm and up to 3 places", "Farm FloodPass proof for loans and aid", "SAFE messages to family"],
  },
  {
    code: "address_check",
    family: "ADDRESS",
    name: "Rent and Land Check",
    priceLabel: "N5,000 once",
    amountKobo: 500_000,
    periodDays: 0,
    interval: null,
    status: "live",
    who: "Anyone about to rent, buy or build",
    gets: ["The flood history we know for one address, before you pay"],
  },
  {
    code: "protect",
    family: "PROTECT",
    name: "Protect",
    priceLabel: "About N1,500 to N3,000 a month",
    amountKobo: 0,
    periodDays: 30,
    interval: "monthly",
    status: "waitlist",
    who: "Families and shops in flood spots",
    gets: ["Family Plus, plus real cash cover from a licensed insurance company, paid fast when your FloodPass confirms damage"],
  },
];

export function planByCode(code: unknown) {
  return PLANS.find((plan) => plan.code === code) ?? null;
}

export type Entitlements = {
  family: PlanFamily;
  /** How many places can be watched in total, home included. */
  maxPlaces: number;
  maxFamily: number;
  nightCall: boolean;
  safe: boolean;
  vault: boolean;
};

export const FREE_ENTITLEMENTS: Entitlements = { family: "FREE", maxPlaces: 1, maxFamily: 0, nightCall: false, safe: false, vault: false };

const BY_FAMILY: Record<PlanFamily, Entitlements> = {
  FREE: FREE_ENTITLEMENTS,
  FAMILY_PLUS: { family: "FAMILY_PLUS", maxPlaces: 5, maxFamily: 5, nightCall: true, safe: true, vault: true },
  DIASPORA: { family: "DIASPORA", maxPlaces: 5, maxFamily: 5, nightCall: true, safe: true, vault: true },
  FARMER: { family: "FARMER", maxPlaces: 3, maxFamily: 3, nightCall: false, safe: true, vault: true },
  ADDRESS: FREE_ENTITLEMENTS,
  PROTECT: { family: "PROTECT", maxPlaces: 5, maxFamily: 5, nightCall: true, safe: true, vault: true },
};

/** The best extras across all active plans a person has. */
export function mergeEntitlements(families: PlanFamily[]): Entitlements {
  return families.reduce<Entitlements>((best, family) => {
    const e = BY_FAMILY[family] ?? FREE_ENTITLEMENTS;
    return {
      family: e.maxPlaces > best.maxPlaces ? e.family : best.family,
      maxPlaces: Math.max(best.maxPlaces, e.maxPlaces),
      maxFamily: Math.max(best.maxFamily, e.maxFamily),
      nightCall: best.nightCall || e.nightCall,
      safe: best.safe || e.safe,
      vault: best.vault || e.vault,
    };
  }, FREE_ENTITLEMENTS);
}

/** Night in Nigeria (West Africa Time, UTC+1): 22:00 to 06:00. */
export function isNightInNigeria(at = new Date()) {
  const hour = (at.getUTCHours() + 1) % 24;
  return hour >= 22 || hour < 6;
}
