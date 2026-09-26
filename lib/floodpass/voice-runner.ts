import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/floodpass/channels/phone";
import { spellCode, voiceXml, type VoiceStep } from "@/lib/floodpass/channels/voice-xml";
import { asLang, type FpLang } from "@/lib/floodpass/messages";
import { isStorageNotReady, submitReport } from "@/lib/floodpass/service";
import { sendSms } from "@/lib/floodpass/channels/africastalking";
import { findOfficialSafetyState, findReportedStateWarning } from "@/lib/intelligence/official-advisory";
import { publicBaseUrl } from "@/lib/floodpass/conversation-runner";

/**
 * Phone calls, for people who cannot read or have no smartphone.
 *
 * Someone calls FloodPass: they hear a short menu and press a key.
 *   1  hear the warning for their area
 *   2  report flood water (then press 1 to 4 for depth)
 *   3  hear what to do in a flood
 * FloodPass calls someone (a warning, or a Family Plus night call): they hear
 * the waiting warning twice, slowly.
 */

const SPEECH: Record<FpLang, Record<string, string>> = {
  en: {
    welcome: "Welcome to FloodPass.",
    menu: "To hear the flood warning for your area, press 1. To report flood water, press 2. To hear what to do in a flood, press 3.",
    noPlace: "We do not know your area yet. Please dial our USSD code, or send your area and state by SMS to this number. Goodbye.",
    depth: "How deep is the water? Press 1 for ankle. 2 for knee. 3 for waist. 4 for up to a car roof.",
    verified: "Thank you. Your report is verified. Your FloodPass code is: {code}. We have sent it to you by SMS. Goodbye.",
    saved: "Thank you. Your report is saved. When your neighbours confirm it, we will send your FloodPass by SMS. If water is rising, move to high ground now. Goodbye.",
    warningOn: "Official warning from {authority}. {headline}. Follow their advice. In an emergency, call 1 1 2. Goodbye.",
    warningNone: "There is no official flood warning for {place} right now. FloodPass never says a place is safe. If water rises, move to high ground. Goodbye.",
    advice: "Move people first, then valuables, to high ground. Never walk or drive through moving water. Switch off electricity at the main switch if it is safe. Keep your papers and phone in a waterproof bag. In an emergency, call 1 1 2. Goodbye.",
    again: "Here is the message again.",
    nothing: "Hello, this is FloodPass. There is no new message for you. Goodbye.",
    error: "Sorry, something went wrong. Please call again later. Goodbye.",
  },
  pcm: {
    welcome: "Welcome to FloodPass.",
    menu: "To hear flood warning for your area, press 1. To report flood water, press 2. To hear wetin to do for flood, press 3.",
    noPlace: "We never know your area. Abeg dial our USSD code, or send your area and state by SMS to this number. Bye bye.",
    depth: "How deep the water be? Press 1 for ankle. 2 for knee. 3 for waist. 4 if e reach motor roof.",
    verified: "Thank you. Your report don verify. Your FloodPass code na: {code}. We don send am to you by SMS. Bye bye.",
    saved: "Thank you. We don save your report. When your neighbours confirm am, we go send your FloodPass by SMS. If water dey rise, go high ground now. Bye bye.",
    warningOn: "Official warning from {authority}. {headline}. Follow wetin dem talk. For emergency, call 1 1 2. Bye bye.",
    warningNone: "No official flood warning for {place} now. FloodPass no dey talk say place safe. If water rise, go high ground. Bye bye.",
    advice: "Move people first, then your things, go high ground. No waka or drive inside water wey dey move. Off light for main switch if e safe. Keep your papers and phone inside waterproof bag. For emergency, call 1 1 2. Bye bye.",
    again: "Make we talk am again.",
    nothing: "Hello, na FloodPass. No new message for you. Bye bye.",
    error: "Sorry, something spoil. Abeg call again later. Bye bye.",
  },
};

function speak(lang: FpLang, key: string, vars: Record<string, string> = {}) {
  return (SPEECH[lang][key] ?? SPEECH.en[key]).replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? "");
}

export type VoiceCallback = {
  isActive: string;
  sessionId?: string;
  direction?: string;
  callerNumber?: string;
  destinationNumber?: string;
  dtmfDigits?: string;
};

/** Who is the person on this call (not our own number)? */
export function personOnCall(body: VoiceCallback, ourNumber = process.env.AT_VOICE_NUMBER?.trim()) {
  const caller = normalizePhone(body.callerNumber);
  const destination = normalizePhone(body.destinationNumber);
  const ours = normalizePhone(ourNumber);
  if (/outbound/i.test(String(body.direction ?? ""))) return destination ?? caller;
  if (caller && caller !== ours) return caller;
  return destination;
}

export async function handleVoice(body: VoiceCallback, step: string | null, callbackUrl: (step: string) => string): Promise<string> {
  if (body.isActive === "0") return ""; // the call has ended; nothing to say
  const phone = personOnCall(body);
  try {
    const contact = phone ? await prisma.floodPassContact.findFirst({ where: { OR: [{ address: phone }, { phone }] } }) : null;
    const lang = asLang(contact?.language);
    const say = (key: string, vars: Record<string, string> = {}): VoiceStep => ({ say: speak(lang, key, vars) });

    // A call we made: read the waiting warning twice.
    const outbound = /outbound/i.test(String(body.direction ?? ""));
    if (contact && !step) {
      const waiting = await prisma.warningDelivery.findFirst({
        where: { contactId: contact.id, channel: { in: ["voice", "voice_night"] }, createdAt: { gte: new Date(Date.now() - 30 * 60_000) } },
        orderBy: { createdAt: "desc" },
      });
      if (waiting) return voiceXml([{ say: waiting.message }, say("again"), { say: waiting.message }]);
    }
    if (outbound && !step) return voiceXml([say("nothing")]);

    if (!step) {
      return voiceXml([say("welcome"), { ask: speak(lang, "menu"), numDigits: 1, callbackUrl: callbackUrl("menu") }]);
    }

    const digit = String(body.dtmfDigits ?? "").replace(/[^0-9]/g, "").slice(0, 1);
    if (step === "menu") {
      if (digit === "1") {
        if (!contact || contact.latitude == null || contact.longitude == null) return voiceXml([say("noPlace")]);
        const official = (await findOfficialSafetyState(contact.latitude, contact.longitude).catch(() => null))
          ?? (await findReportedStateWarning(contact.latitude, contact.longitude).catch(() => null));
        if (official?.active) return voiceXml([say("warningOn", { authority: official.authority, headline: official.headline.toLowerCase() })]);
        return voiceXml([say("warningNone", { place: contact.placeName ?? "your area" })]);
      }
      if (digit === "2") {
        if (!contact || contact.latitude == null || contact.longitude == null || !contact.consentAt) return voiceXml([say("noPlace")]);
        return voiceXml([{ ask: speak(lang, "depth"), numDigits: 1, callbackUrl: callbackUrl("depth") }]);
      }
      if (digit === "3") return voiceXml([say("advice")]);
      return voiceXml([{ ask: speak(lang, "menu"), numDigits: 1, callbackUrl: callbackUrl("menu") }]);
    }

    if (step === "depth") {
      const depth = ({ "1": "ANKLE", "2": "KNEE", "3": "WAIST", "4": "CAR_ROOF" } as Record<string, string>)[digit];
      if (!depth) return voiceXml([{ ask: speak(lang, "depth"), numDigits: 1, callbackUrl: callbackUrl("depth") }]);
      if (!contact || contact.latitude == null || contact.longitude == null) return voiceXml([say("noPlace")]);
      const outcome = await submitReport({
        channel: "voice",
        reporterKey: contact.reporterKey,
        latitude: contact.latitude,
        longitude: contact.longitude,
        placeName: contact.placeName,
        state: contact.state,
        depth,
        locationSource: (contact.locationSource as "gps" | "place_name") ?? "place_name",
        language: lang,
      });
      if (outcome.pass && phone) {
        await sendSms(phone, `FloodPass ${outcome.pass.code} VERIFIED. ${outcome.pass.placeName}. Check it at ${publicBaseUrl()}/pass/${outcome.pass.code}`);
        return voiceXml([say("verified", { code: spellCode(outcome.pass.code) })]);
      }
      return voiceXml([say("saved")]);
    }
    return voiceXml([say("error")]);
  } catch (error) {
    if (!isStorageNotReady(error)) console.error("floodpass voice failed", error);
    return voiceXml([{ say: speak("en", "error") }]);
  }
}
