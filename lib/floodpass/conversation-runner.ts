import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decide, render, type ContactChannel, type ContactState, type Inbound, type PendingReport, type Step } from "@/lib/floodpass/conversation";
import { personKeyForPhone, reporterKeyFor } from "@/lib/floodpass/identity";
import { asLang, depthText, shortDate, t, tFor, type FpLang } from "@/lib/floodpass/messages";
import { checkPass, isStorageNotReady, submitReport } from "@/lib/floodpass/service";
import { nearestHotspot } from "@/lib/floodpass/hotspots";
import { placeByName, placeFor } from "@/lib/floodpass/places";
import { inspectPhoto } from "@/lib/floodpass/photo-intake";
import { savePhoto, deletePhotosForOwner, signedPhotoPath } from "@/lib/floodpass/photos";
import { answerQuestion } from "@/lib/floodpass/ai/helper";
import { downloadWhatsAppMedia } from "@/lib/floodpass/whatsapp";
import { maskPhone, normalizePhone } from "@/lib/floodpass/channels/phone";
import { sendToContact, sendToPhone } from "@/lib/floodpass/channels/send";
import { entitlementsForPhone } from "@/lib/floodpass/billing/entitlements";
import { confirmDrain, DrainError, markDrainCleaned, pointsFor, reportBlockedDrain, requestReward } from "@/lib/floodpass/drains";
import { DRAIN_POINTS, REWARD } from "@/lib/floodpass/drain-rules";
import { findOfficialSafetyState, findReportedStateWarning, nearestKnownState } from "@/lib/intelligence/official-advisory";

export function publicBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://naijaclimaguard.vercel.app").replace(/\/+$/, "");
}

async function placeFrom(latitude: number, longitude: number, name?: string | null) {
  const fix = await placeFor(latitude, longitude).catch(() => null);
  const state = fix?.state ?? nearestHotspot(latitude, longitude, 3)?.hotspot.state ?? (await nearestKnownState(latitude, longitude).catch(() => null));
  if (name && name.trim()) return { place: name.trim().slice(0, 120), state };
  if (fix) return { place: fix.from === "lga" ? `near ${fix.name}` : fix.name, state };
  return { place: `your pin (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`, state };
}

/** WhatsApp beats SMS beats voice for sending warnings; once someone uses WhatsApp, we keep using it. */
export function preferredChannel(current: string | null | undefined, incoming: ContactChannel): string {
  const rank: Record<string, number> = { whatsapp: 3, sms: 2, ussd: 2, voice: 1, simulator: 0 };
  const now = current ?? incoming;
  const pick = (rank[incoming] ?? 0) > (rank[now] ?? 0) ? incoming : now;
  return pick === "ussd" ? "sms" : pick;
}

/** Downloads a photo a person sent on WhatsApp. Other channels have no photos. */
async function inboundPhoto(channel: ContactChannel, photoRef: string | null | undefined) {
  if (channel !== "whatsapp" || !photoRef?.startsWith("wa-media:")) return null;
  const media = await downloadWhatsAppMedia(photoRef);
  return media ? { bytes: media.bytes, mimeType: media.mimeType } : null;
}

/**
 * Handles one inbound message from one person and returns the replies to send.
 * channel: "whatsapp", "sms", or "simulator" (the founder's demo screen).
 * USSD and voice have their own menus (ussd-runner.ts, voice route) but share
 * the same contacts, reports and passes.
 */
export async function handleInbound(channel: ContactChannel, rawAddress: string, message: Inbound): Promise<string[]> {
  try {
    const phone = channel === "simulator" ? null : normalizePhone(rawAddress);
    const address = phone ?? rawAddress;
    const personKey = phone ? personKeyForPhone(phone) : reporterKeyFor(channel, address);
    const row = await prisma.floodPassContact.findUnique({ where: { address } });
    const language: FpLang = asLang(row?.language);
    const state: ContactState = {
      exists: Boolean(row),
      step: (row?.step as Step) ?? "NEW",
      language,
      hasLocation: row?.latitude != null && row?.longitude != null,
      placeName: row?.placeName ?? null,
      pending: (row?.pendingReport as unknown as PendingReport | null) ?? null,
      channel,
    };
    const decision = decide(state, message);
    const lang: FpLang = decision.set.language ?? language;
    const vars: Record<string, string | number> = { place: state.placeName ?? "", url: `${publicBaseUrl()}/floodpass/plans` };
    const extra: string[] = [];
    const say = (key: string, more: Record<string, string | number> = {}) => extra.push(tFor(channel, lang, key, { ...vars, ...more }));

    const contactData: Prisma.FloodPassContactUpdateInput = {};
    if (decision.set.step) contactData.step = decision.set.step;
    if (decision.set.language) contactData.language = decision.set.language;
    if (decision.set.consent) contactData.consentAt = new Date();
    if (decision.set.pending !== undefined) contactData.pendingReport = decision.set.pending ? (decision.set.pending as unknown as Prisma.InputJsonValue) : Prisma.DbNull;
    if (row) {
      const preferred = preferredChannel(row.channel, channel);
      if (preferred !== row.channel) contactData.channel = preferred;
      if (phone && row.phone !== phone) contactData.phone = phone;
      if (channel === "whatsapp") contactData.lastInboundAt = new Date();
    }
    const home = row?.latitude != null && row?.longitude != null ? { latitude: row.latitude, longitude: row.longitude } : null;

    switch (decision.action.type) {
      case "create_contact": {
        await prisma.floodPassContact.upsert({
          where: { address },
          create: {
            address,
            channel: preferredChannel(null, channel),
            phone,
            reporterKey: personKey,
            step: "CONSENT",
            lastInboundAt: channel === "whatsapp" ? new Date() : null,
          },
          update: { step: "CONSENT" },
        });
        break;
      }
      case "delete_contact": {
        if (row) {
          await deletePhotosForOwner(row.reporterKey).catch(() => 0);
          await prisma.floodPassContact.delete({ where: { address } }).catch(() => undefined);
        }
        return render(lang, decision.replies, vars, channel);
      }
      case "save_location": {
        const { latitude, longitude, name } = decision.action;
        const { place, state: stateName } = await placeFrom(latitude, longitude, name);
        contactData.latitude = latitude;
        contactData.longitude = longitude;
        contactData.placeName = place;
        contactData.state = stateName;
        contactData.locationSource = "gps";
        vars.place = place;
        break;
      }
      case "find_place": {
        const found = await placeByName(decision.action.text);
        if (!found) {
          if (state.step === "LOCATION") say("placeNotFound", { text: decision.action.text.slice(0, 40) });
          else say("help");
          break;
        }
        contactData.latitude = found.latitude;
        contactData.longitude = found.longitude;
        contactData.placeName = found.name;
        contactData.state = found.state;
        contactData.locationSource = "place_name";
        if (state.step === "LOCATION") contactData.step = "READY";
        say(state.step === "LOCATION" ? "ready" : "moved", { place: found.name });
        break;
      }
      case "submit_report": {
        const pending = decision.action.pending;
        const latitude = pending.latitude ?? row?.latitude;
        const longitude = pending.longitude ?? row?.longitude;
        if (latitude == null || longitude == null || !row) {
          contactData.step = "LOCATION";
          say("location");
          break;
        }
        // Let the AI look at the photo once; keep the photo privately as proof.
        const media = await inboundPhoto(channel, pending.photoRef);
        const inspected = media ? await inspectPhoto(media.bytes, media.mimeType) : null;
        const outcome = await submitReport({
          channel: channel === "simulator" ? "whatsapp" : channel === "sms" ? "sms" : "whatsapp",
          reporterKey: row.reporterKey,
          latitude,
          longitude,
          placeName: pending.latitude != null ? null : row.placeName,
          state: pending.latitude != null ? null : row.state,
          depth: decision.action.depth,
          photoRef: pending.photoRef ?? null,
          photoTakenAt: pending.photoAt ? new Date(pending.photoAt) : null,
          photoHash: inspected?.photoHash ?? null,
          aiPhoto: inspected?.aiPhoto ?? null,
          photoLive: Boolean(pending.photoRef) && !pending.photoForwarded,
          locationSource: pending.latitude != null ? "gps" : (row.locationSource as "gps" | "place_name") ?? "gps",
          language: lang,
          reportedAt: new Date(pending.startedAt),
        });
        if (media) await savePhoto({ bytes: media.bytes, mimeType: media.mimeType, kind: "FLOOD", ownerKey: row.reporterKey, reportId: outcome.reportId }).catch(() => null);
        if (outcome.pass) say("verified", { code: outcome.pass.code, url: `${publicBaseUrl()}/pass/${outcome.pass.code}` });
        else say(outcome.status === "LIKELY" ? "likely" : "unconfirmed", { score: outcome.score });
        if (outcome.alsoVerified.length) await notifyNeighbours(outcome.alsoVerified);
        break;
      }
      case "check_code": {
        const result = await checkPass(decision.action.code);
        if (!result.found) say("checkMissing", { code: decision.action.code });
        else if (result.pass.status === "REVOKED") say("checkRevoked", { code: result.pass.code });
        else say("checkFound", {
          code: result.pass.code,
          place: result.pass.placeName,
          date: shortDate(result.pass.floodedAt, lang),
          depth: depthText(lang, result.pass.depth),
          passed: result.pass.checksPassed,
          total: result.pass.checksTotal,
        });
        break;
      }
      case "ask": {
        let officialWarning: string | null = null;
        let currentStatus: string | null = null;
        if (home) {
          const official = (await findOfficialSafetyState(home.latitude, home.longitude).catch(() => null))
            ?? (await findReportedStateWarning(home.latitude, home.longitude).catch(() => null));
          if (official?.active) {
            officialWarning = `${official.authority}: ${official.headline}`;
            currentStatus = official.level === "WARNING" || official.level === "EMERGENCY" ? "DANGER" : "BE_CAREFUL";
          } else currentStatus = "NO_WARNING_YET";
        }
        const answer = await answerQuestion(decision.action.question, lang, { placeName: row?.placeName ?? null, state: row?.state ?? null, currentStatus, officialWarning });
        extra.push(answer ?? tFor(channel, lang, "help", vars));
        break;
      }
      case "create_drain": {
        const pending = decision.action.pending;
        const latitude = pending.latitude ?? home?.latitude;
        const longitude = pending.longitude ?? home?.longitude;
        if (latitude == null || longitude == null || !row) { contactData.step = "LOCATION"; say("location"); break; }
        const media = await inboundPhoto(channel, pending.photoRef);
        const drain = await reportBlockedDrain({
          reporterKey: row.reporterKey,
          latitude,
          longitude,
          photo: media,
          photoHash: media ? null : pending.photoRef ? `ref:${pending.photoRef}` : null,
        });
        say("drainSaved", { code: drain.code, place: drain.placeName });
        break;
      }
      case "clean_drain": {
        if (!row) break;
        const media = await inboundPhoto(channel, decision.action.pending.photoRef);
        try {
          const result = await markDrainCleaned({
            code: decision.action.code,
            cleanerKey: row.reporterKey,
            photo: media,
            photoHash: media ? null : `ref:${decision.action.pending.photoRef ?? ""}`,
          });
          if (result.outcome === "REJECTED") say("drainState", { code: result.code, status: lang === "pcm" ? "REJECTED (na the same picture)" : "REJECTED (it is the same photo as before)" });
          else say("cleanSaved", { code: result.code, points: DRAIN_POINTS.cleaned });
        } catch (error) {
          if (error instanceof DrainError && error.code === "missing") say("drainMissing", { code: decision.action.code });
          else if (error instanceof DrainError && error.code === "state") say("drainState", { code: decision.action.code, status: error.message });
          else throw error;
        }
        break;
      }
      case "confirm_drain": {
        if (!row) break;
        const result = await confirmDrain({ code: decision.action.code, confirmerKey: row.reporterKey, latitude: home?.latitude ?? null, longitude: home?.longitude ?? null, approximatePlace: row.locationSource === "place_name" });
        const code = decision.action.code;
        if (result.check === "missing") say("drainMissing", { code });
        else if (result.check === "own") say("confirmOwn");
        else if (result.check === "far") say("confirmFar", { code });
        else if (result.check === "limit") say("confirmLimit");
        else if (result.check === "not-cleaned") say("drainState", { code, status: result.status ?? "BLOCKED" });
        else {
          say("confirmSaved", { code, points: DRAIN_POINTS.confirmed });
          if (result.verified && result.cleanerKey) await notifyDrainHero(result.cleanerKey, code);
        }
        break;
      }
      case "points": {
        if (!row) break;
        say("points", { points: await pointsFor(row.reporterKey), per: REWARD.pointsPerUnit, naira: REWARD.nairaPerUnit });
        break;
      }
      case "reward": {
        if (!row) break;
        const result = await requestReward(row.reporterKey, row.phone ?? phone);
        if (result.status === "requested") say("rewardAsked", { naira: result.naira, points: result.points });
        else if (result.status === "pending") say("rewardPending");
        else if (result.status === "too-few") say("rewardTooFew", { min: result.min, points: result.points });
        else say("help");
        break;
      }
      case "safe": {
        if (!row) break;
        const extras = await entitlementsForPhone(row.phone ?? phone);
        if (!extras.safe) { say("planNeeded"); break; }
        const family = await prisma.familyMember.findMany({ where: { contactId: row.id } });
        if (!family.length) { say("safeNoFamily"); break; }
        const when = shortDate(new Date().toISOString(), lang);
        const who = row.phone ?? phone ?? "Your family member";
        const text = t(lang, "safeMessage", { name: who, time: when });
        let count = 0;
        for (const member of family) {
          const sent = await sendToPhone(member.phone, text, { key: "safe", params: [who, when], lang });
          if (sent.status !== "FAILED") count += 1;
        }
        say("safeSent", { count });
        break;
      }
      case "add_family": {
        if (!row) break;
        const extras = await entitlementsForPhone(row.phone ?? phone);
        if (extras.maxFamily < 1) { say("planNeeded"); break; }
        const member = normalizePhone(decision.action.phone);
        if (!member) { say("familyBadPhone"); break; }
        const count = await prisma.familyMember.count({ where: { contactId: row.id } });
        if (count >= extras.maxFamily) { say("familyFull", { max: extras.maxFamily }); break; }
        await prisma.familyMember.upsert({ where: { contactId_phone: { contactId: row.id, phone: member } }, create: { contactId: row.id, phone: member }, update: {} });
        say("familyAdded", { phone: maskPhone(member) });
        break;
      }
      case "add_place":
      case "add_place_text": {
        if (!row) break;
        const extras = await entitlementsForPhone(row.phone ?? phone);
        const watched = await prisma.watchedPlace.count({ where: { contactId: row.id } });
        if (extras.maxPlaces <= 1) { say("planNeeded"); break; }
        if (watched + 1 >= extras.maxPlaces) { say("placesFull", { max: extras.maxPlaces }); break; }
        let spot: { name: string; latitude: number; longitude: number; state: string | null } | null = null;
        if (decision.action.type === "add_place") {
          const { place, state: stateName } = await placeFrom(decision.action.latitude, decision.action.longitude, decision.action.name);
          spot = { name: place, latitude: decision.action.latitude, longitude: decision.action.longitude, state: stateName };
        } else {
          const found = await placeByName(decision.action.text);
          if (found) spot = { name: found.name, latitude: found.latitude, longitude: found.longitude, state: found.state };
        }
        if (!spot) { say("placeNotFound", { text: decision.action.type === "add_place_text" ? decision.action.text.slice(0, 40) : "" }); break; }
        await prisma.watchedPlace.create({ data: { contactId: row.id, name: spot.name, latitude: spot.latitude, longitude: spot.longitude, state: spot.state, kind: extras.family === "FARMER" ? "FARM" : "FAMILY" } });
        say("placeAdded", { place: spot.name, count: watched + 2, max: extras.maxPlaces });
        break;
      }
      case "list_places": {
        if (!row) break;
        const places = await prisma.watchedPlace.findMany({ where: { contactId: row.id }, orderBy: { createdAt: "asc" } });
        const list = [row.placeName ?? "", ...places.map((p) => p.name)].filter(Boolean).join("; ");
        say("placesList", { list: list || "none yet" });
        break;
      }
      case "save_vault": {
        if (!row) break;
        const extras = await entitlementsForPhone(row.phone ?? phone);
        if (!extras.vault) { contactData.step = "READY"; contactData.pendingReport = Prisma.DbNull; say("planNeeded"); break; }
        const media = await inboundPhoto(channel, decision.action.pending.photoRef);
        if (media) await savePhoto({ bytes: media.bytes, mimeType: media.mimeType, kind: "VAULT", ownerKey: row.reporterKey });
        const count = await prisma.floodPhoto.count({ where: { ownerKey: row.reporterKey, kind: "VAULT" } });
        say("vaultSaved", { count });
        break;
      }
      case "open_vault": {
        if (!row) break;
        const photos = await prisma.floodPhoto.findMany({ where: { ownerKey: row.reporterKey, kind: "VAULT" }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true } });
        if (!photos.length) { say("vaultEmpty"); break; }
        say("vaultLinks", { links: photos.map((p) => `${publicBaseUrl()}${signedPhotoPath(p.id, 1800)}`).join(" ") });
        break;
      }
      default:
        break;
    }

    if (row || decision.action.type === "create_contact") {
      if (Object.keys(contactData).length) await prisma.floodPassContact.update({ where: { address }, data: contactData });
    }
    return [...render(lang, decision.replies, vars, channel), ...extra];
  } catch (error) {
    if (isStorageNotReady(error)) return [t("en", "notReady")];
    console.error("floodpass conversation failed", error);
    return [t("en", "error")];
  }
}

function reachable(contact: { channel: string; address: string; phone: string | null; language: string; lastInboundAt: Date | null }) {
  return { channel: contact.channel, address: contact.address, phone: contact.phone, language: contact.language, lastInboundAt: contact.lastInboundAt };
}

/** When a new report verifies a neighbour's earlier report, tell that neighbour. */
async function notifyNeighbours(codes: string[]) {
  const passes = await prisma.floodPass.findMany({ where: { code: { in: codes } }, include: { report: { select: { reporterKey: true } } } });
  for (const pass of passes) {
    const contact = await prisma.floodPassContact.findUnique({ where: { reporterKey: pass.report.reporterKey } });
    if (!contact) continue;
    const lang = asLang(contact.language);
    const url = `${publicBaseUrl()}/pass/${pass.code}`;
    await sendToContact(reachable(contact), t(lang, "neighbourVerified", { code: pass.code, url }), { key: "pass_ready", params: [pass.code, url] });
  }
}

/** Tells the cleaner their drain is verified. */
async function notifyDrainHero(cleanerKey: string, code: string) {
  const contact = await prisma.floodPassContact.findUnique({ where: { reporterKey: cleanerKey } });
  if (!contact) return;
  const lang = asLang(contact.language);
  await sendToContact(reachable(contact), t(lang, "drainVerified", { code, points: DRAIN_POINTS.cleaned }), { key: "drain_verified", params: [code, String(DRAIN_POINTS.cleaned)] });
}

/** Merges several replies into one SMS where they fit, to save money. */
export function joinForSms(replies: string[], limit = 459) {
  const out: string[] = [];
  for (const reply of replies.filter(Boolean)) {
    const last = out[out.length - 1];
    if (last && last.length + 1 + reply.length <= limit) out[out.length - 1] = `${last} ${reply}`;
    else out.push(reply);
  }
  return out;
}
