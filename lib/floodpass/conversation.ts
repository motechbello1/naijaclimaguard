/**
 * The WhatsApp/SMS conversation, as a pure decision function.
 *
 * decide(contact, message) says what to change and what to reply. It touches
 * no database and no network, so every path can be tested. The executor in
 * conversation-runner.ts carries the decision out.
 */
import { looksLikePassCode, normalizePassCode } from "@/lib/floodpass/ledger";
import { parseDepth } from "@/lib/floodpass/truth-engine";
import { asLang, tFor, type FpLang } from "@/lib/floodpass/messages";
import { looksLikeQuestion } from "@/lib/floodpass/ai/helper";

export type Step =
  | "NEW"
  | "CONSENT"
  | "LANGUAGE"
  | "LOCATION"
  | "READY"
  | "AWAIT_DEPTH"
  /** Waiting for a photo of a blocked drain. */
  | "AWAIT_DRAIN"
  /** Waiting for a photo of a cleaned drain. */
  | "AWAIT_CLEAN"
  /** Waiting for an extra place to watch (Family Plus). */
  | "AWAIT_PLACE"
  /** Saving photos of belongings to the private vault (Family Plus). */
  | "AWAIT_VAULT";

export type ContactChannel = "whatsapp" | "sms" | "ussd" | "voice" | "simulator";

export type ContactState = {
  exists: boolean;
  step: Step;
  language: FpLang;
  hasLocation: boolean;
  placeName: string | null;
  pending: PendingReport | null;
  /** How this message arrived. SMS cannot carry pins or photos. Defaults to whatsapp. */
  channel?: ContactChannel;
};

export type PendingReport = {
  photoRef?: string | null;
  photoAt?: string | null;
  /** WhatsApp marked the photo as forwarded, so it may not be from here and now. */
  photoForwarded?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  /** For AWAIT_CLEAN: which drain. */
  drainCode?: string | null;
  startedAt: string;
};

export type Inbound =
  | { kind: "text"; text: string; at: string }
  | { kind: "location"; latitude: number; longitude: number; name?: string | null; at: string }
  | { kind: "image"; mediaId: string; caption?: string | null; forwarded?: boolean; at: string }
  | { kind: "other"; at: string };

export type Action =
  | { type: "none" }
  | { type: "create_contact" }
  | { type: "delete_contact" }
  | { type: "save_location"; latitude: number; longitude: number; name?: string | null }
  /** A typed place name (SMS, or WhatsApp users who cannot send a pin). */
  | { type: "find_place"; text: string }
  | { type: "submit_report"; depth: string; pending: PendingReport }
  | { type: "check_code"; code: string }
  | { type: "ask"; question: string }
  | { type: "create_drain"; pending: PendingReport }
  | { type: "clean_drain"; code: string; pending: PendingReport }
  | { type: "confirm_drain"; code: string; latitude?: number | null; longitude?: number | null }
  | { type: "points" }
  | { type: "reward" }
  | { type: "safe" }
  | { type: "add_family"; phone: string }
  | { type: "add_place"; latitude: number; longitude: number; name?: string | null }
  | { type: "add_place_text"; text: string }
  | { type: "list_places" }
  | { type: "save_vault"; pending: PendingReport }
  | { type: "open_vault" };

export type Decision = {
  set: Partial<{ step: Step; language: FpLang; consent: boolean; pending: PendingReport | null }>;
  action: Action;
  /** Reply keys resolved to text by the runner (it knows the place name, codes and so on). */
  replies: string[];
};

const YES = /^(yes|y|yeah|yep|ok|okay|i agree|agree|yes o|yes please|oya)\b/i;
const STOP = /^(stop|unsubscribe|leave|comot|quit|end)\b/i;
const HELLO = /^(hi|hello|hey|start|join|good (morning|afternoon|evening)|how far)\b/i;
const WATER = /^(water|flood|wata|report|1|water here|flood here|help flood)\b/i;
const HELP = /^(help|menu|\?)\b/i;
const LANGUAGE = /^(language|lang|change language)\b/i;
const CANCEL = /^(cancel|no|back)\b/i;
const DRAIN = /^(drain|gutter|blocked drain)\b/i;
const CLEANED = /^(cleaned|clean|cleared)\b/i;
const CONFIRM = /^(confirm|confam)\b/i;
const POINTS = /^(points|my points|hero)\b/i;
const REWARD = /^(reward|airtime|redeem)\b/i;
const SAFE = /^(safe|i am safe|i'm safe|im safe|i dey okay|i dey safe)\b/i;
const FAMILY = /^family\b\s*(.*)$/i;
const ADD_PLACE = /^(add place|add a place|new place|watch place)\b/i;
const PLACES = /^(places|my places)\b/i;
const PLANS = /^(plan|plans|family plus|upgrade|subscribe)\b/i;
const VAULT = /^(vault|photo vault|save photos)\b/i;
const MY_VAULT = /^(my vault|open vault|see vault)\b/i;
const DONE = /^(done|finish|finished)\b/i;

function codeIn(text: string) {
  const match = text.toUpperCase().match(/\bFP[\s-]?[A-Z]{3}[\s-]?[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4,8}\b/);
  if (!match) return null;
  const raw = match[0].replace(/^FP[\s-]?([A-Z]{3})[\s-]?/, "FP-$1-");
  const code = normalizePassCode(raw);
  return looksLikePassCode(code) ? code : null;
}

/** Drain codes look like D-7K2Q. */
export function drainCodeIn(text: string) {
  const match = text.toUpperCase().match(/\bD[\s-]?([23456789ABCDEFGHJKMNPQRSTVWXYZ]{4,6})\b/);
  return match ? `D-${match[1]}` : null;
}

const none: Action = { type: "none" };

function textOnly(contact: ContactState) {
  const channel = contact.channel ?? "whatsapp";
  return channel === "sms" || channel === "ussd" || channel === "voice";
}

export function decide(contact: ContactState, message: Inbound): Decision {
  const text = message.kind === "text" ? message.text.trim() : message.kind === "image" ? (message.caption ?? "").trim() : "";

  // Leaving always works, from any step.
  if (text && STOP.test(text)) {
    return { set: {}, action: contact.exists ? { type: "delete_contact" } : none, replies: ["stop"] };
  }

  if (!contact.exists || contact.step === "NEW") {
    return { set: { step: "CONSENT" }, action: { type: "create_contact" }, replies: ["welcome"] };
  }

  // Leaving a half-finished step.
  if (text && CANCEL.test(text) && ["AWAIT_DEPTH", "AWAIT_DRAIN", "AWAIT_CLEAN", "AWAIT_PLACE", "AWAIT_VAULT"].includes(contact.step)) {
    return { set: { step: "READY", pending: null }, action: none, replies: ["cancelled"] };
  }

  switch (contact.step) {
    case "CONSENT": {
      if (text && YES.test(text)) return { set: { step: "LANGUAGE", consent: true }, action: none, replies: ["language"] };
      return { set: {}, action: none, replies: ["consentAgain"] };
    }
    case "LANGUAGE": {
      const lower = text.toLowerCase();
      if (lower === "1" || lower.startsWith("eng")) return { set: { language: "en", step: contact.hasLocation ? "READY" : "LOCATION" }, action: none, replies: [contact.hasLocation ? "help" : "location"] };
      if (lower === "2" || lower.startsWith("pid") || lower === "pcm") return { set: { language: "pcm", step: contact.hasLocation ? "READY" : "LOCATION" }, action: none, replies: [contact.hasLocation ? "help" : "location"] };
      return { set: {}, action: none, replies: ["language"] };
    }
    case "LOCATION": {
      if (message.kind === "location") {
        return { set: { step: "READY" }, action: { type: "save_location", latitude: message.latitude, longitude: message.longitude, name: message.name }, replies: ["ready"] };
      }
      // A typed place name works everywhere; the runner moves the step on only if it is found.
      if (text && text.length >= 3) return { set: {}, action: { type: "find_place", text }, replies: [] };
      return { set: {}, action: none, replies: ["location"] };
    }
    case "AWAIT_DEPTH": {
      const pending: PendingReport = contact.pending ?? { startedAt: message.at };
      if (message.kind === "image") {
        return { set: { pending: { ...pending, photoRef: message.mediaId, photoAt: message.at, photoForwarded: Boolean(message.forwarded) } }, action: none, replies: ["photoSaved"] };
      }
      if (message.kind === "location") {
        return { set: { pending: { ...pending, latitude: message.latitude, longitude: message.longitude } }, action: none, replies: ["askDepth"] };
      }
      const depth = parseDepth(text);
      if (depth !== "UNKNOWN") {
        return { set: { step: "READY", pending: null }, action: { type: "submit_report", depth, pending }, replies: [] };
      }
      const code = text ? codeIn(text) : null;
      if (code) return { set: {}, action: { type: "check_code", code }, replies: [] };
      return { set: {}, action: none, replies: ["askDepthAgain"] };
    }
    case "AWAIT_DRAIN": {
      const pending: PendingReport = contact.pending ?? { startedAt: message.at };
      if (message.kind === "location") {
        return { set: { pending: { ...pending, latitude: message.latitude, longitude: message.longitude } }, action: none, replies: ["drainAsk"] };
      }
      if (message.kind === "image") {
        const withPhoto = { ...pending, photoRef: message.mediaId, photoAt: message.at, photoForwarded: Boolean(message.forwarded) };
        return { set: { step: "READY", pending: null }, action: { type: "create_drain", pending: withPhoto }, replies: [] };
      }
      return { set: {}, action: none, replies: ["drainAsk"] };
    }
    case "AWAIT_CLEAN": {
      const pending: PendingReport = contact.pending ?? { startedAt: message.at };
      if (message.kind === "location") {
        return { set: { pending: { ...pending, latitude: message.latitude, longitude: message.longitude } }, action: none, replies: ["cleanAsk"] };
      }
      if (message.kind === "image" && pending.drainCode) {
        const withPhoto = { ...pending, photoRef: message.mediaId, photoAt: message.at, photoForwarded: Boolean(message.forwarded) };
        return { set: { step: "READY", pending: null }, action: { type: "clean_drain", code: pending.drainCode, pending: withPhoto }, replies: [] };
      }
      return { set: {}, action: none, replies: ["cleanAsk"] };
    }
    case "AWAIT_PLACE": {
      if (message.kind === "location") {
        return { set: { step: "READY", pending: null }, action: { type: "add_place", latitude: message.latitude, longitude: message.longitude, name: message.name }, replies: [] };
      }
      if (text && text.length >= 3) return { set: { step: "READY", pending: null }, action: { type: "add_place_text", text }, replies: [] };
      return { set: {}, action: none, replies: ["addPlaceAsk"] };
    }
    case "AWAIT_VAULT": {
      if (message.kind === "image") {
        return { set: {}, action: { type: "save_vault", pending: { startedAt: message.at, photoRef: message.mediaId, photoAt: message.at } }, replies: [] };
      }
      if (text && DONE.test(text)) return { set: { step: "READY", pending: null }, action: none, replies: ["vaultDone"] };
      return { set: {}, action: none, replies: ["vaultAsk"] };
    }
    case "READY":
    default: {
      if (message.kind === "image") {
        return { set: { step: "AWAIT_DEPTH", pending: { startedAt: message.at, photoRef: message.mediaId, photoAt: message.at, photoForwarded: Boolean(message.forwarded) } }, action: none, replies: ["photoSaved"] };
      }
      if (message.kind === "location") {
        return { set: {}, action: { type: "save_location", latitude: message.latitude, longitude: message.longitude, name: message.name }, replies: ["moved"] };
      }
      const code = text ? codeIn(text) : null;
      if (code) return { set: {}, action: { type: "check_code", code }, replies: [] };
      if (text && WATER.test(text)) {
        return { set: { step: "AWAIT_DEPTH", pending: { startedAt: message.at } }, action: none, replies: ["askDepth"] };
      }

      // Drain Heroes.
      const drainCode = text ? drainCodeIn(text) : null;
      if (text && CONFIRM.test(text) && drainCode) return { set: {}, action: { type: "confirm_drain", code: drainCode }, replies: [] };
      if (text && CLEANED.test(text) && drainCode) {
        if (textOnly(contact)) return { set: {}, action: none, replies: ["drainNeedsPhoto"] };
        return { set: { step: "AWAIT_CLEAN", pending: { startedAt: message.at, drainCode } }, action: none, replies: ["cleanAsk"] };
      }
      if (text && DRAIN.test(text)) {
        if (textOnly(contact)) return { set: {}, action: none, replies: ["drainNeedsPhoto"] };
        return { set: { step: "AWAIT_DRAIN", pending: { startedAt: message.at } }, action: none, replies: ["drainAsk"] };
      }
      if (text && POINTS.test(text)) return { set: {}, action: { type: "points" }, replies: [] };
      if (text && REWARD.test(text)) return { set: {}, action: { type: "reward" }, replies: [] };

      // Family Plus.
      if (text && SAFE.test(text)) return { set: {}, action: { type: "safe" }, replies: [] };
      const family = text.match(FAMILY);
      if (family) {
        const digits = family[1].replace(/[^0-9+]/g, "");
        if (digits.length >= 10) return { set: {}, action: { type: "add_family", phone: digits }, replies: [] };
        return { set: {}, action: none, replies: ["familyBadPhone"] };
      }
      if (text && ADD_PLACE.test(text)) return { set: { step: "AWAIT_PLACE", pending: { startedAt: message.at } }, action: none, replies: ["addPlaceAsk"] };
      if (text && PLACES.test(text)) return { set: {}, action: { type: "list_places" }, replies: [] };
      if (text && PLANS.test(text)) return { set: {}, action: none, replies: ["plansInfo"] };
      if (text && MY_VAULT.test(text)) return { set: {}, action: { type: "open_vault" }, replies: [] };
      if (text && VAULT.test(text)) {
        if (textOnly(contact)) return { set: {}, action: none, replies: ["drainNeedsPhoto"] };
        return { set: { step: "AWAIT_VAULT", pending: { startedAt: message.at } }, action: none, replies: ["vaultAsk"] };
      }

      if (text && LANGUAGE.test(text)) return { set: { step: "LANGUAGE" }, action: none, replies: ["language"] };
      if (text && (HELLO.test(text) || HELP.test(text))) return { set: {}, action: none, replies: ["help"] };
      // A real question goes to the AI Chat Helper; it falls back to the menu if AI is off.
      if (text && looksLikeQuestion(text)) return { set: {}, action: { type: "ask", question: text }, replies: [] };
      // On SMS a lone place name moves the watched place (there are no pins on SMS).
      if (text && textOnly(contact) && /^[a-z][a-z\s,.-]{2,60}$/i.test(text)) return { set: {}, action: { type: "find_place", text }, replies: [] };
      return { set: {}, action: none, replies: ["help"] };
    }
  }
}

/** Resolves reply keys into text. */
export function render(lang: FpLang, keys: string[], vars: Record<string, string | number> = {}, channel: ContactChannel = "whatsapp") {
  return keys.map((key) => tFor(channel, asLang(lang), key, vars));
}
