import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { con, end, parseUssd, ussdText, type UssdStart } from "@/lib/floodpass/ussd";
import { normalizePhone } from "@/lib/floodpass/channels/phone";
import { personKeyForPhone } from "@/lib/floodpass/identity";
import { asLang, depthText, shortDate } from "@/lib/floodpass/messages";
import { checkPass, isStorageNotReady, submitReport } from "@/lib/floodpass/service";
import { placeByName } from "@/lib/floodpass/places";
import { deletePhotosForOwner } from "@/lib/floodpass/photos";
import { confirmDrain, pointsFor } from "@/lib/floodpass/drains";
import { DRAIN_POINTS, REWARD } from "@/lib/floodpass/drain-rules";
import { drainCodeIn } from "@/lib/floodpass/conversation";
import { looksLikePassCode, normalizePassCode } from "@/lib/floodpass/ledger";
import { sendSms } from "@/lib/floodpass/channels/africastalking";
import { findOfficialSafetyState, findReportedStateWarning } from "@/lib/intelligence/official-advisory";
import { preferredChannel, publicBaseUrl } from "@/lib/floodpass/conversation-runner";

type SessionMark = { sessionId: string; consented: boolean; hasPlace: boolean };

function readMark(pending: Prisma.JsonValue | null): SessionMark | null {
  const value = (pending as { ussd?: SessionMark } | null)?.ussd;
  return value && typeof value.sessionId === "string" ? value : null;
}

/** "FPABJ7K2Q", "fp abj 7k2q" and "FP-ABJ-7K2Q" all mean the same code. */
export function codeFromKeypad(text: string) {
  const compact = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = compact.match(/^FP([A-Z]{3})([23456789ABCDEFGHJKMNPQRSTVWXYZ]{4,8})$/);
  if (!match) return null;
  const code = normalizePassCode(`FP-${match[1]}-${match[2]}`);
  return looksLikePassCode(code) ? code : null;
}

/** One USSD request in, one screen out (a string starting with CON or END). */
export async function handleUssd(input: { sessionId: string; phoneNumber: string; text: string }): Promise<string> {
  const phone = normalizePhone(input.phoneNumber);
  if (!phone) return end(ussdText("en", "error"));
  try {
    let row = await prisma.floodPassContact.findUnique({ where: { address: phone } });
    const lang = asLang(row?.language);
    const say = (key: string, vars: Record<string, string | number> = {}) => ussdText(lang, key, vars);

    // Remember how this session started, so "1*Gudu Abuja" keeps meaning the same thing.
    let start: UssdStart = { consented: Boolean(row?.consentAt), hasPlace: row?.latitude != null };
    const mark = row ? readMark(row.pendingReport) : null;
    if (mark && mark.sessionId === input.sessionId) start = { consented: mark.consented, hasPlace: mark.hasPlace };
    else if (row) {
      const pending = (row.pendingReport && typeof row.pendingReport === "object" && !Array.isArray(row.pendingReport) ? row.pendingReport : {}) as Record<string, unknown>;
      await prisma.floodPassContact.update({
        where: { id: row.id },
        data: { pendingReport: { ...pending, ussd: { sessionId: input.sessionId, ...start } } as Prisma.InputJsonValue },
      });
    }

    const { screen, consentNow } = parseUssd(input.text, start);

    if (consentNow && !row?.consentAt) {
      row = await prisma.floodPassContact.upsert({
        where: { address: phone },
        create: {
          address: phone,
          phone,
          channel: preferredChannel(null, "ussd"),
          reporterKey: personKeyForPhone(phone),
          consentAt: new Date(),
          step: "LOCATION",
          pendingReport: { ussd: { sessionId: input.sessionId, consented: false, hasPlace: false } },
        },
        update: { consentAt: new Date(), step: row?.latitude != null ? "READY" : "LOCATION", phone },
      });
    }

    switch (screen.kind) {
      case "consent":
        return con(say("consent"));
      case "declined":
        return end(say("declined"));
      case "invalid":
        return end(say("invalid"));
      case "ask_place":
        return con(say(screen.reason === "first" ? "askPlaceFirst" : "askPlaceChange"));
      case "set_place": {
        if (!row) return end(say("error"));
        const found = await placeByName(screen.text);
        if (!found) return end(say("placeMissing", { text: screen.text.slice(0, 30) }));
        await prisma.floodPassContact.update({
          where: { id: row.id },
          data: { latitude: found.latitude, longitude: found.longitude, placeName: found.name, state: found.state, locationSource: "place_name", step: "READY" },
        });
        return end(say("placeSet", { place: found.name }));
      }
      case "main":
        return con(say("main", { place: (row?.placeName ?? "").slice(0, 22) }));
      case "depth":
        return con(say("depth"));
      case "submit": {
        if (!row || row.latitude == null || row.longitude == null) return end(say("error"));
        const outcome = await submitReport({
          channel: "ussd",
          reporterKey: row.reporterKey,
          latitude: row.latitude,
          longitude: row.longitude,
          placeName: row.placeName,
          state: row.state,
          depth: screen.depth,
          locationSource: (row.locationSource as "gps" | "place_name") ?? "place_name",
          language: lang,
        });
        if (outcome.pass) {
          await sendSms(phone, `FloodPass ${outcome.pass.code} VERIFIED. ${outcome.pass.placeName}. Check it at ${publicBaseUrl()}/pass/${outcome.pass.code}`);
          return end(say("verified", { code: outcome.pass.code }));
        }
        return end(say("checking", { score: outcome.score }));
      }
      case "warnings": {
        if (!row || row.latitude == null || row.longitude == null) return end(say("error"));
        const official = (await findOfficialSafetyState(row.latitude, row.longitude).catch(() => null))
          ?? (await findReportedStateWarning(row.latitude, row.longitude).catch(() => null));
        if (official?.active) return end(say("warningOn", { authority: official.authority, headline: official.headline.toLowerCase() }));
        return end(say("warningNone", { place: (row.placeName ?? "your area").slice(0, 30) }));
      }
      case "ask_code":
        return con(say("askCode"));
      case "check_code": {
        const code = codeFromKeypad(screen.text);
        if (!code) return end(say("codeMissing", { code: screen.text.slice(0, 16) }));
        const result = await checkPass(code);
        if (!result.found) return end(say("codeMissing", { code }));
        if (result.pass.status === "REVOKED") return end(say("codeRevoked", { code }));
        return end(say("codeFound", { code, place: result.pass.placeName.slice(0, 40), date: shortDate(result.pass.floodedAt, lang), depth: depthText(lang, result.pass.depth) }));
      }
      case "language": {
        if (!row) return end(say("error"));
        const next = lang === "pcm" ? "en" : "pcm";
        await prisma.floodPassContact.update({ where: { id: row.id }, data: { language: next } });
        return end(ussdText(lang, "language"));
      }
      case "ask_drain":
        return con(say("askDrain"));
      case "confirm_drain": {
        if (!row) return end(say("error"));
        const code = drainCodeIn(screen.text) ?? drainCodeIn(`D-${screen.text.toUpperCase().replace(/^D/, "")}`);
        if (!code) return end(say("drainNo", { code: screen.text.slice(0, 10), why: lang === "pcm" ? "code no correct" : "code not recognised" }));
        const result = await confirmDrain({ code, confirmerKey: row.reporterKey, latitude: row.latitude, longitude: row.longitude, approximatePlace: row.locationSource === "place_name" });
        if (result.check === "ok") return end(say("drainOk", { code, points: DRAIN_POINTS.confirmed }));
        const why: Record<string, string> = {
          missing: lang === "pcm" ? "we no see am" : "no such drain",
          own: lang === "pcm" ? "na your own" : "it is your own drain",
          far: lang === "pcm" ? "you no dey near am" : "your area is too far from it",
          limit: lang === "pcm" ? "enough for today" : "daily limit reached",
          "not-cleaned": lang === "pcm" ? "dem never clean am" : "it is not marked cleaned yet",
        };
        return end(say("drainNo", { code, why: why[result.check] ?? "" }));
      }
      case "points": {
        if (!row) return end(say("error"));
        return end(say("points", { points: await pointsFor(row.reporterKey), per: REWARD.pointsPerUnit, naira: REWARD.nairaPerUnit }));
      }
      case "stop": {
        if (row) {
          await deletePhotosForOwner(row.reporterKey).catch(() => 0);
          await prisma.floodPassContact.delete({ where: { id: row.id } }).catch(() => undefined);
        }
        return end(say("stop"));
      }
      default:
        return end(say("invalid"));
    }
  } catch (error) {
    if (isStorageNotReady(error)) return end(ussdText("en", "notReady"));
    console.error("floodpass ussd failed", error);
    return end(ussdText("en", "error"));
  }
}
