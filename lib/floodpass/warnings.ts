import { prisma } from "@/lib/db";
import { distanceKm } from "@/lib/floodpass/truth-engine";
import { asLang, buildWarning, type FpLang, type WarningParts } from "@/lib/floodpass/messages";
import { writeWarning } from "@/lib/floodpass/ai/warning-writer";
import { memorySentence } from "@/lib/floodpass/street-memory";
import { streetMemoryFor } from "@/lib/floodpass/street-memory-store";
import { callPhone, sendToContact, type Delivery } from "@/lib/floodpass/channels/send";
import { entitlementsForPhone } from "@/lib/floodpass/billing/entitlements";
import { isNightInNigeria } from "@/lib/floodpass/billing/plans";
import { ALL_STATES } from "@/lib/floodpass/places";

/**
 * Flood warning broadcasts.
 *
 * The law (NiMet Act 2022) makes NiMet the voice of weather warnings in
 * Nigeria, so FloodPass never makes up a warning. A warning here always names
 * an official source and links to it, and a person approves it before it goes
 * out. FloodPass's job is the last mile: getting that official warning to
 * every street, in plain words, on the phone people actually use, with what
 * this street has learned from past floods.
 */

export type WarningInput = {
  level: "DANGER" | "BE_CAREFUL";
  hazard: string;
  placeLabel: string;
  window: string;
  source: string;
  sourceUrl: string | null;
  action: string;
  avoid: string | null;
  areaType: "RADIUS" | "STATE";
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
  states: string[];
  expiresAt: Date;
};

const clean = (value: unknown, max: number) => String(value ?? "").replace(/[*\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max);

/** Checks a warning before it is saved. Returns the cleaned warning or a list of problems. */
export function validateWarning(body: Record<string, unknown>): { ok: true; value: WarningInput } | { ok: false; problems: string[] } {
  const problems: string[] = [];
  const hazard = clean(body.hazard, 80);
  const placeLabel = clean(body.placeLabel, 80);
  const window = clean(body.window, 80);
  const source = clean(body.source, 60);
  const action = clean(body.action, 200);
  const avoid = clean(body.avoid, 80) || null;
  const sourceUrl = clean(body.sourceUrl, 400) || null;
  if (!hazard) problems.push("Say what the danger is (for example: Heavy rain and flash floods).");
  if (!placeLabel) problems.push("Say where (for example: Gudu, Apo and Lokogoma).");
  if (!window) problems.push("Say when (for example: from 4pm to 9pm today).");
  if (!source) problems.push("Name the official source (NiMet, NIHSA, NEMA or a state emergency agency).");
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) problems.push("Add the link to the official warning.");
  if (!action) problems.push("Say what people should do.");
  if (/\bsafe\b/i.test(`${hazard} ${action} ${placeLabel}`)) problems.push("Do not tell people a place is safe.");

  const level = body.level === "DANGER" ? "DANGER" : "BE_CAREFUL";
  const areaType = body.areaType === "STATE" ? "STATE" : "RADIUS";
  let latitude: number | null = null;
  let longitude: number | null = null;
  let radiusKm: number | null = null;
  let states: string[] = [];
  if (areaType === "RADIUS") {
    latitude = Number(body.latitude);
    longitude = Number(body.longitude);
    radiusKm = Number(body.radiusKm);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) problems.push("Pick the centre of the area on the map.");
    if (!Number.isFinite(radiusKm) || radiusKm < 0.2 || radiusKm > 100) problems.push("The area must be between 0.2 km and 100 km across.");
  } else {
    const raw = Array.isArray(body.states) ? body.states : String(body.states ?? "").split(",");
    states = raw.map((s) => String(s).trim()).filter((s) => ALL_STATES.includes(s));
    if (!states.length) problems.push("Pick at least one state.");
  }
  const hours = Number(body.expiresInHours);
  const expiresAt = new Date(Date.now() + (Number.isFinite(hours) && hours > 0 ? Math.min(hours, 168) : 24) * 3600_000);
  if (problems.length) return { ok: false, problems };
  return { ok: true, value: { level, hazard, placeLabel, window, source, sourceUrl, action, avoid, areaType, latitude, longitude, radiusKm, states, expiresAt } };
}

export type AreaPoint = { latitude: number | null; longitude: number | null; state: string | null };

/** Is this point inside the warning's area? */
export function inWarningArea(warning: { areaType: string; latitude: number | null; longitude: number | null; radiusKm: number | null; state: string | null }, point: AreaPoint) {
  if (warning.areaType === "STATE") {
    const states = String(warning.state ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return Boolean(point.state && states.includes(point.state));
  }
  if (warning.latitude == null || warning.longitude == null || warning.radiusKm == null || point.latitude == null || point.longitude == null) return false;
  return distanceKm(warning.latitude, warning.longitude, point.latitude, point.longitude) <= warning.radiusKm;
}

export async function createWarning(input: WarningInput, createdBy: "founder" | "auto-news", externalReportId?: string) {
  return prisma.floodWarning.create({
    data: {
      level: input.level,
      hazard: input.hazard,
      placeLabel: input.placeLabel,
      window: input.window,
      source: input.source,
      sourceUrl: input.sourceUrl,
      action: input.action,
      avoid: input.avoid,
      areaType: input.areaType,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusKm: input.radiusKm,
      state: input.areaType === "STATE" ? input.states.join(",") : null,
      expiresAt: input.expiresAt,
      createdBy,
      externalReportId: externalReportId ?? null,
    },
  });
}

type WarningRow = NonNullable<Awaited<ReturnType<typeof prisma.floodWarning.findUnique>>>;

/** Everyone who agreed to warnings and lives (or watches a place) inside the area. */
export async function recipientsFor(warning: WarningRow) {
  const base = { consentAt: { not: null } };
  let contactIds = new Set<string>();
  if (warning.areaType === "STATE") {
    const states = String(warning.state ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const [homes, extras] = await Promise.all([
      prisma.floodPassContact.findMany({ where: { ...base, state: { in: states } }, select: { id: true } }),
      prisma.watchedPlace.findMany({ where: { state: { in: states } }, select: { contactId: true } }),
    ]);
    contactIds = new Set([...homes.map((c) => c.id), ...extras.map((p) => p.contactId)]);
  } else if (warning.latitude != null && warning.longitude != null && warning.radiusKm != null) {
    const dLat = warning.radiusKm / 111;
    const dLon = warning.radiusKm / (111 * Math.max(0.2, Math.cos((warning.latitude * Math.PI) / 180)));
    const box = { latitude: { gte: warning.latitude - dLat, lte: warning.latitude + dLat }, longitude: { gte: warning.longitude - dLon, lte: warning.longitude + dLon } };
    const [homes, extras] = await Promise.all([
      prisma.floodPassContact.findMany({ where: { ...base, ...box }, select: { id: true, latitude: true, longitude: true, state: true } }),
      prisma.watchedPlace.findMany({ where: box, select: { contactId: true, latitude: true, longitude: true, state: true } }),
    ]);
    for (const c of homes) if (inWarningArea(warning, c)) contactIds.add(c.id);
    for (const p of extras) if (inWarningArea(warning, p)) contactIds.add(p.contactId);
  }
  if (!contactIds.size) return [];
  return prisma.floodPassContact.findMany({ where: { id: { in: Array.from(contactIds) }, consentAt: { not: null } } });
}

function partsFor(warning: WarningRow): WarningParts {
  return { hazard: warning.hazard, place: warning.placeLabel, window: warning.window, source: warning.source, action: warning.action, avoid: warning.avoid ?? undefined };
}

/** What each language group would receive, and how many people. Sends nothing. */
export async function previewWarning(id: string) {
  const warning = await prisma.floodWarning.findUnique({ where: { id } });
  if (!warning) return null;
  const people = await recipientsFor(warning);
  const byChannel: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};
  for (const person of people) {
    byChannel[person.channel] = (byChannel[person.channel] ?? 0) + 1;
    byLanguage[person.language] = (byLanguage[person.language] ?? 0) + 1;
  }
  const [en, pcm] = await Promise.all([writeWarning(partsFor(warning), "en"), writeWarning(partsFor(warning), "pcm")]);
  return { warning, recipients: people.length, byChannel, byLanguage, messages: { en, pcm } };
}

/**
 * Sends the next batch of an approved warning. Safe to call again and again:
 * people who already got it are skipped. Returns how many are left.
 */
export async function sendWarningBatch(id: string, limit = 80) {
  const warning = await prisma.floodWarning.findUnique({ where: { id } });
  if (!warning || warning.status !== "SENDING") return { sent: 0, failed: 0, left: 0, status: warning?.status ?? "MISSING" };
  if (warning.expiresAt && warning.expiresAt.getTime() < Date.now()) {
    await prisma.floodWarning.update({ where: { id }, data: { status: "SENT", finishedAt: new Date() } });
    return { sent: 0, failed: 0, left: 0, status: "SENT" };
  }

  const people = await recipientsFor(warning);
  // Night calls are extra rows ("voice_night"); every other row is someone's main delivery.
  const done = await prisma.warningDelivery.findMany({ where: { warningId: id, channel: { not: "voice_night" } }, select: { contactId: true } });
  const doneIds = new Set(done.map((d) => d.contactId));
  const waiting = people.filter((p) => !doneIds.has(p.id));
  const batch = waiting.slice(0, limit);

  const written: Partial<Record<FpLang, { message: string; writtenBy: "ai" | "template" }>> = {};
  const messageFor = async (lang: FpLang) => (written[lang] ??= await writeWarning(partsFor(warning), lang));
  const night = warning.level === "DANGER" && isNightInNigeria();

  let sent = 0;
  let failed = 0;
  for (const person of batch) {
    const lang = asLang(person.language);
    const base = await messageFor(lang);
    let message = base.message;
    if (person.latitude != null && person.longitude != null) {
      const memory = await streetMemoryFor(person.latitude, person.longitude).catch(() => null);
      const line = memorySentence(memory, lang);
      if (line) message = `${message}\n${line}`;
    }
    // Write the row BEFORE sending: a phone call reads it when the person picks up, and
    // the unique key stops two runs (the button and the 15-minute job) sending twice.
    const planned = person.channel === "voice" ? "voice" : person.channel === "whatsapp" ? "whatsapp" : "sms";
    let row: { id: string };
    try {
      row = await prisma.warningDelivery.create({ data: { warningId: id, contactId: person.id, channel: planned, status: "QUEUED", message, writtenBy: base.writtenBy }, select: { id: true } });
    } catch {
      continue;
    }
    const template = { key: "warning" as const, params: [warning.placeLabel, warning.hazard, warning.window, warning.source, warning.action] };
    const delivery: Delivery = await sendToContact(
      { channel: person.channel, address: person.address, phone: person.phone, language: person.language, lastInboundAt: person.lastInboundAt },
      message,
      template,
    );
    await prisma.warningDelivery
      .update({ where: { id: row.id }, data: { status: delivery.status, error: delivery.error ?? null, channel: delivery.channel === "none" ? planned : delivery.channel } })
      .catch(() => undefined);
    if (delivery.status === "FAILED") failed += 1;
    else sent += 1;

    // Family Plus: a phone call at night when danger is close, so nobody sleeps through it.
    if (night && person.phone && person.channel !== "voice") {
      const extras = await entitlementsForPhone(person.phone);
      if (extras.nightCall) {
        const call = await prisma.warningDelivery
          .create({ data: { warningId: id, contactId: person.id, channel: "voice_night", status: "QUEUED", message: buildWarning(lang, partsFor(warning)), writtenBy: "template" }, select: { id: true } })
          .catch(() => null);
        if (call) {
          const result = await callPhone(person.phone);
          await prisma.warningDelivery.update({ where: { id: call.id }, data: { status: result.status, error: result.error ?? null } }).catch(() => undefined);
        }
      }
    }
  }

  const left = Math.max(0, waiting.length - batch.length);
  await prisma.floodWarning.update({
    where: { id },
    data: {
      recipients: people.length,
      sent: { increment: sent },
      failed: { increment: failed },
      ...(left === 0 ? { status: "SENT", finishedAt: new Date() } : {}),
    },
  });
  return { sent, failed, left, status: left === 0 ? "SENT" : "SENDING" };
}

const OFFICIAL = [
  { name: "NiMet", match: /nimet|meteorological agency/i, domain: /nimet\.gov\.ng/i },
  { name: "NIHSA", match: /nihsa|hydrological services/i, domain: /nihsa\.gov\.ng/i },
  { name: "NEMA", match: /\bnema\b|emergency management agency/i, domain: /nema\.gov\.ng/i },
];

/** Which official agency, if any, a news headline or link is about. */
export function officialAgencyIn(title: string, url: string) {
  return OFFICIAL.find((agency) => agency.domain.test(url) || agency.match.test(title))?.name ?? null;
}

/**
 * Turns fresh official warnings reported in the news into DRAFT broadcasts for
 * a person to check. Never sends anything by itself.
 */
export async function draftWarningsFromNews(hours = 24) {
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await prisma.externalFloodReport.findMany({
    where: { status: "WARNING", publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });
  let created = 0;
  for (const row of rows) {
    const agency = officialAgencyIn(row.title, row.url);
    if (!agency) continue;
    const meta = (row.metadata ?? {}) as { states?: unknown };
    const states = (Array.isArray(meta.states) ? meta.states.map(String) : [row.state ?? ""]).filter((s) => ALL_STATES.includes(s));
    if (!states.length) continue;
    const exists = await prisma.floodWarning.findUnique({ where: { externalReportId: row.id }, select: { id: true } });
    if (exists) continue;
    const rain = /rain|storm|thunder/i.test(row.title);
    await createWarning(
      {
        level: "BE_CAREFUL",
        hazard: rain ? "Heavy rain and flooding" : "Flooding",
        placeLabel: states.length > 3 ? `${states.slice(0, 3).join(", ")} and ${states.length - 3} more states` : states.join(", "),
        window: "in the coming days",
        source: agency,
        sourceUrl: row.url,
        action: "Get ready now: move valuables up, clear the drain near you, and know your way to high ground.",
        avoid: null,
        areaType: "STATE",
        latitude: null,
        longitude: null,
        radiusKm: null,
        states,
        expiresAt: new Date(Date.now() + 72 * 3600_000),
      },
      "auto-news",
      row.id,
    ).then(() => { created += 1; }, () => undefined);
  }
  return created;
}
