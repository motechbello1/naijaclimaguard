import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_STATES, insideNigeria, placeFromRegistry, searchableNames, STATE_CAPITALS } from "../places";
import { NIGERIA_JURISDICTIONS } from "../../intelligence/live-flood-feed";
import { applyReading, storedReading, type NewsReading } from "../ai/news-reader";
import { readAiPhoto } from "../ai/photo-check";
import { decodeWebPhoto } from "../photo-intake";
import { decide, type ContactState } from "../conversation";
import { scoreReport, type TruthInput } from "../truth-engine";

test("all 36 states and the FCT are covered, with the same names the news reader uses", () => {
  assert.equal(STATE_CAPITALS.length, 37);
  assert.equal(new Set(ALL_STATES).size, 37);
  const newsStates = NIGERIA_JURISDICTIONS.map((row) => row.state).sort();
  assert.deepEqual([...ALL_STATES].sort(), newsStates);
  for (const row of STATE_CAPITALS) assert.ok(insideNigeria(row.latitude, row.longitude), `${row.capital} should be inside Nigeria`);
});

test("a place is found for any point in Nigeria, best layer first", () => {
  const registry = [
    { name: "Kosofe", state: "Lagos", latitude: 6.59, longitude: 3.4 },
    { name: "Makurdi", state: "Benue", latitude: 7.73, longitude: 8.53 },
  ];
  // Abuja hotspot wins when close.
  const gudu = placeFromRegistry(9.006, 7.475, registry);
  assert.equal(gudu?.from, "hotspot");
  assert.equal(gudu?.state, "FCT");
  // An LGA centre within 40 km.
  const lagos = placeFromRegistry(6.6, 3.41, registry);
  assert.equal(lagos?.from, "lga");
  assert.equal(lagos?.name, "Kosofe");
  assert.equal(lagos?.state, "Lagos");
  // No registry: the nearest state capital still gives a state.
  const maiduguri = placeFromRegistry(11.85, 13.15, []);
  assert.equal(maiduguri?.from, "capital");
  assert.equal(maiduguri?.state, "Borno");
  // Outside Nigeria: no guess.
  assert.equal(placeFromRegistry(51.5, -0.12, registry), null);
});

test("news search names are specific and never coordinates", () => {
  assert.deepEqual(searchableNames(["Ebeano-Gudu Road, Gudu", "Gudu", "Near 9.0060, 7.4750", "Apo", null]), ["Ebeano-Gudu Road", "Gudu"]);
  assert.deepEqual(searchableNames(["Near Kosofe"]), ["Kosofe"]);
});

const item = { state: "Nigeria / location unparsed", states: [] as string[], areas: [] as string[], status: "WATCH" as const, severity: 1 };
const reading = (over: Partial<NewsReading>): NewsReading => ({ kind: "flood_event", states: [], places: [], deaths: null, displaced: null, confidence: 0.9, ...over });

test("the AI News Reader corrects keyword guesses only when it is sure", () => {
  const unsure = applyReading(item, reading({ confidence: 0.5, states: ["Kogi"] }));
  assert.equal(unsure.status, "WATCH");
  const flood = applyReading(item, reading({ states: ["Kogi", "Benue"], places: ["Lokoja"], displaced: 3000 }));
  assert.equal(flood.status, "REPORTED");
  assert.equal(flood.severity, 4);
  assert.equal(flood.state, "Kogi");
  assert.deepEqual(flood.states, ["Kogi", "Benue"]);
  assert.deepEqual(flood.areas, ["Lokoja"]);
  const foreign = applyReading({ ...item, status: "REPORTED" as const, severity: 4 }, reading({ kind: "foreign" }));
  assert.equal(foreign.status, "UNVERIFIED");
  const warning = applyReading(item, reading({ kind: "warning", states: ["Lagos"] }));
  assert.equal(warning.status, "WARNING");
  // Readings saved in the database are read back the same way.
  assert.equal(storedReading({ ai: reading({ states: ["FCT"] }) })?.states[0], "FCT");
  assert.equal(storedReading({ ingestion: "x" }), null);
});

test("stored AI photo verdicts feed the Truth Engine; forwarded or duplicate photos earn less", () => {
  assert.deepEqual(readAiPhoto(null), { ai: null, live: false });
  const saved = readAiPhoto({ floodVisible: "yes", depth: "KNEE", confidence: 0.85, reason: "water over road", source: "ai", live: true });
  assert.equal(saved.live, true);
  assert.equal(saved.ai?.floodVisible, "yes");

  const base: TruthInput = {
    rainfall24hMm: 30,
    neighbourReports: 0,
    photo: { present: true, takenHoursFromReport: null, distanceKm: null, liveCapture: true, ai: saved.ai },
    officialSignal: { present: false },
    history: { knownHotspot: false, earlierVerifiedNearby: 0 },
    rulerReading: false,
  };
  const live = scoreReport(base).checks.find((check) => check.key === "photo");
  const forwarded = scoreReport({ ...base, photo: { ...base.photo, liveCapture: false } }).checks.find((check) => check.key === "photo");
  const copied = scoreReport({ ...base, photo: { ...base.photo, duplicateOfOtherReporter: true } }).checks.find((check) => check.key === "photo");
  assert.equal(live?.points, 17);
  assert.equal(forwarded?.points, 14);
  assert.equal(copied?.points, 0);
});

test("web photos must be real small images", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]).toString("base64");
  assert.equal(decodeWebPhoto(`data:image/jpeg;base64,${jpeg}`)?.mimeType, "image/jpeg");
  assert.equal(decodeWebPhoto(Buffer.from("hello world").toString("base64")), null);
  assert.equal(decodeWebPhoto(`data:image/jpeg;base64,${Buffer.alloc(900_000, 1).toString("base64")}`), null);
  assert.equal(decodeWebPhoto(42), null);
});

const ready: ContactState = { exists: true, step: "READY", language: "en", hasLocation: true, placeName: "Gudu", pending: null };

test("WhatsApp: questions go to the AI helper, forwarded photos are marked", () => {
  const ask = decide(ready, { kind: "text", text: "What should I do if water enters my house?", at: new Date().toISOString() });
  assert.equal(ask.action.type, "ask");
  const menu = decide(ready, { kind: "text", text: "hello", at: new Date().toISOString() });
  assert.equal(menu.action.type, "none");
  assert.deepEqual(menu.replies, ["help"]);
  const photo = decide(ready, { kind: "image", mediaId: "wa-media:123", forwarded: true, at: new Date().toISOString() });
  assert.equal(photo.set.pending?.photoForwarded, true);
  // A pass code is still a pass code, not a question.
  const code = decide(ready, { kind: "text", text: "Is FP-ABJ-7K2Q real?", at: new Date().toISOString() });
  assert.equal(code.action.type, "check_code");
});
