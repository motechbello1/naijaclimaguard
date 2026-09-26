import { randomInt } from "crypto";

/**
 * Drain Heroes rules, in one place, pure and tested.
 *
 * Blocked drains are one of the biggest causes of street flooding in Nigerian
 * cities. Drain Heroes pays people (in points, then airtime from sponsors) to
 * clear them, and uses neighbours and photos so the cleaning is real.
 */

export const DRAIN_POINTS = {
  /** To the person who reported the drain, once it is verified clean. */
  reported: 5,
  /** To the person who cleaned it, once verified. */
  cleaned: 50,
  /** To each neighbour who checks a cleaned drain. */
  confirmed: 2,
};

export const REWARD = {
  /** Points needed per airtime unit. */
  pointsPerUnit: Number(process.env.DRAIN_POINTS_PER_UNIT) || 100,
  /** Naira of airtime per unit. */
  nairaPerUnit: Number(process.env.DRAIN_NAIRA_PER_UNIT) || 200,
  /** Most airtime one person can get in 30 days. */
  maxNairaPer30Days: Number(process.env.DRAIN_MAX_NAIRA_30D) || 1000,
};

/** Neighbours must live within this distance of the drain to confirm it. */
export const CONFIRM_WITHIN_KM = 0.5;
/** For people whose place was typed (SMS, USSD), we only know the area, so allow the area. */
export const CONFIRM_WITHIN_KM_TYPED_PLACE = 5;
/** One person can confirm at most this many drains a day. */
export const CONFIRMS_PER_DAY = 5;
/** Two blocked-drain reports closer than this are the same drain. */
export const SAME_DRAIN_KM = 0.03;

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export function newDrainCode(length = 4) {
  let tail = "";
  for (let i = 0; i < length; i += 1) tail += ALPHABET[randomInt(ALPHABET.length)];
  return `D-${tail}`;
}

export type AiDrainView = { cleared: "yes" | "no" | "unsure"; sameDrain: "yes" | "no" | "unsure"; confidence: number } | null;

/** How many neighbour checks a cleaned drain needs, given what the AI saw. */
export function confirmationsNeeded(ai: AiDrainView) {
  if (!ai) return 2;
  if ((ai.cleared === "no" || ai.sameDrain === "no") && ai.confidence >= 0.7) return 3;
  if (ai.cleared === "yes" && ai.sameDrain !== "no" && ai.confidence >= 0.6) return 1;
  return 2;
}

export type DrainOutcome = "CLEANED" | "VERIFIED" | "REJECTED";

export function drainOutcome(input: { beforeHash: string | null; afterHash: string | null; confirmations: number; ai: AiDrainView }): { outcome: DrainOutcome; reason?: string } {
  if (input.beforeHash && input.afterHash && input.beforeHash === input.afterHash) {
    return { outcome: "REJECTED", reason: "The after photo is the same photo as the before photo." };
  }
  if (input.confirmations >= confirmationsNeeded(input.ai)) return { outcome: "VERIFIED" };
  return { outcome: "CLEANED" };
}

export type ConfirmCheck = "ok" | "own" | "far" | "limit" | "not-cleaned";

export function canConfirm(input: {
  confirmerKey: string;
  reportedByKey: string;
  cleanedByKey: string | null;
  status: string;
  distanceKm: number | null;
  confirmationsToday: number;
  /** The confirmer's place was typed, not pinned. */
  approximatePlace?: boolean;
}): ConfirmCheck {
  if (input.status !== "CLEANED") return "not-cleaned";
  if (input.confirmerKey === input.reportedByKey || input.confirmerKey === input.cleanedByKey) return "own";
  const limit = input.approximatePlace ? CONFIRM_WITHIN_KM_TYPED_PLACE : CONFIRM_WITHIN_KM;
  if (input.distanceKm == null || input.distanceKm > limit) return "far";
  if (input.confirmationsToday >= CONFIRMS_PER_DAY) return "limit";
  return "ok";
}

/** How much airtime a person can ask for now. */
export function rewardFor(availablePoints: number, nairaPaidLast30Days: number) {
  const units = Math.floor(Math.max(0, availablePoints) / REWARD.pointsPerUnit);
  const roomNaira = Math.max(0, REWARD.maxNairaPer30Days - Math.max(0, nairaPaidLast30Days));
  const unitsAllowed = Math.min(units, Math.floor(roomNaira / REWARD.nairaPerUnit));
  return { units: unitsAllowed, naira: unitsAllowed * REWARD.nairaPerUnit, points: unitsAllowed * REWARD.pointsPerUnit };
}

/** A public name that never shows a phone number. */
export function heroAlias(reporterKey: string) {
  return `Hero ${reporterKey.slice(0, 4).toUpperCase()}`;
}
