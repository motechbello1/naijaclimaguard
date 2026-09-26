import { createHash, randomInt } from "crypto";

/**
 * The Flood Record: a locked book of FloodPasses.
 *
 * Every FloodPass carries a fingerprint (SHA-256 hash) of its own facts plus
 * the fingerprint of the FloodPass before it. Like pages glued into a book in
 * order: changing or removing any page breaks every fingerprint after it, so
 * tampering is visible to anyone who re-checks the chain.
 */

export const GENESIS_HASH = "0".repeat(64);

export type LedgerFacts = {
  sequence: number;
  code: string;
  placeName: string;
  state: string | null;
  latitude: number;
  longitude: number;
  depth: string;
  floodedAt: string; // ISO time
  score: number;
  engineVersion: string;
};

export type LedgerEntry = LedgerFacts & { previousHash: string; hash: string };

/** JSON with sorted keys and fixed number formatting, so the same facts always hash the same way. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(Number(value.toFixed(6))) : "null";
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export function fingerprint(facts: LedgerFacts, previousHash: string): string {
  return createHash("sha256").update(previousHash).update("|").update(canonicalJson(facts)).digest("hex");
}

export function sealEntry(facts: LedgerFacts, previousHash: string): LedgerEntry {
  return { ...facts, previousHash, hash: fingerprint(facts, previousHash) };
}

export type ChainCheck = { intact: boolean; checked: number; brokenAtSequence: number | null; reason: string | null };

/** Re-computes every fingerprint in order. Entries must be sorted by sequence. */
export function verifyChain(entries: LedgerEntry[]): ChainCheck {
  let previous = GENESIS_HASH;
  let expectedSequence = entries.length ? entries[0].sequence : 1;
  for (const entry of entries) {
    if (entry.sequence !== expectedSequence) {
      return { intact: false, checked: entry.sequence, brokenAtSequence: entry.sequence, reason: `A page is missing before number ${entry.sequence}.` };
    }
    if (entry.previousHash !== previous) {
      return { intact: false, checked: entry.sequence, brokenAtSequence: entry.sequence, reason: `Page ${entry.sequence} does not point to the page before it.` };
    }
    const { previousHash, hash, ...facts } = entry;
    if (fingerprint(facts, previousHash) !== hash) {
      return { intact: false, checked: entry.sequence, brokenAtSequence: entry.sequence, reason: `Page ${entry.sequence} was changed after it was locked.` };
    }
    previous = hash;
    expectedSequence += 1;
  }
  return { intact: true, checked: entries.length, brokenAtSequence: null, reason: null };
}

// Crockford-style alphabet without look-alike characters (no 0/O, 1/I/L, U).
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

const REGION_CODES: Record<string, string> = {
  FCT: "ABJ", Abia: "ABI", Adamawa: "ADA", "Akwa Ibom": "AKW", Anambra: "ANA", Bauchi: "BAU", Bayelsa: "BAY",
  Benue: "BEN", Borno: "BOR", "Cross River": "CRS", Delta: "DEL", Ebonyi: "EBO", Edo: "EDO", Ekiti: "EKI",
  Enugu: "ENU", Gombe: "GOM", Imo: "IMO", Jigawa: "JIG", Kaduna: "KAD", Kano: "KAN", Katsina: "KAT",
  Kebbi: "KEB", Kogi: "KOG", Kwara: "KWA", Lagos: "LAG", Nasarawa: "NAS", Niger: "NIG", Ogun: "OGU",
  Ondo: "OND", Osun: "OSU", Oyo: "OYO", Plateau: "PLA", Rivers: "RIV", Sokoto: "SOK", Taraba: "TAR",
  Yobe: "YOB", Zamfara: "ZAM",
};

export function regionCode(state: string | null | undefined) {
  if (!state) return "NGA";
  return REGION_CODES[state] ?? state.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X");
}

/** A short code a person can read out on the phone, for example FP-ABJ-7K2Q. */
export function generatePassCode(state: string | null | undefined, length = 4) {
  let tail = "";
  for (let i = 0; i < length; i += 1) tail += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `FP-${regionCode(state)}-${tail}`;
}

export function normalizePassCode(input: string) {
  return String(input ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/^FP(?=[A-Z0-9]{3}-)/, "FP-");
}

export function looksLikePassCode(input: string) {
  return /^FP-[A-Z]{3}-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4,8}$/.test(normalizePassCode(input));
}
