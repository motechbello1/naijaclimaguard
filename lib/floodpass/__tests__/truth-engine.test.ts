import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreReport, statusFor, parseDepth, distanceKm, VERIFIED_AT, type TruthInput } from "../truth-engine";

const quiet: TruthInput = {
  rainfall24hMm: 0,
  neighbourReports: 0,
  photo: { present: false, takenHoursFromReport: null, distanceKm: null },
  officialSignal: { present: false },
  history: { knownHotspot: false, earlierVerifiedNearby: 0 },
  rulerReading: false,
};

test("a lone report with no rain and no evidence is not confirmed", () => {
  const r = scoreReport(quiet);
  assert.equal(r.score, 0);
  assert.equal(r.status, "UNCONFIRMED");
  assert.equal(r.checksTotal, 6);
});

test("heavy rain + 2 neighbours + AI-confirmed local photo + known hotspot is verified", () => {
  const r = scoreReport({
    ...quiet,
    rainfall24hMm: 42,
    neighbourReports: 2,
    photo: { present: true, takenHoursFromReport: 0.5, distanceKm: 0.2, ai: { floodVisible: "yes", confidence: 0.9 } },
    history: { knownHotspot: true, earlierVerifiedNearby: 0 },
  });
  assert.equal(r.score, 25 + 20 + 20 + 10);
  assert.equal(r.status, "VERIFIED");
  assert.equal(r.checksPassed, 4);
});

test("the same evidence with a photo nobody checked stays just below verified", () => {
  const r = scoreReport({
    ...quiet,
    rainfall24hMm: 42,
    neighbourReports: 2,
    photo: { present: true, takenHoursFromReport: 0.5, distanceKm: 0.2 },
    history: { knownHotspot: true, earlierVerifiedNearby: 0 },
  });
  assert.equal(r.checks.find((c) => c.key === "photo")?.points, 14);
  assert.equal(r.status, "LIKELY");
});

test("if the AI sees no flood water, the photo earns nothing", () => {
  const r = scoreReport({ ...quiet, photo: { present: true, takenHoursFromReport: 0, distanceKm: 0, ai: { floodVisible: "no", confidence: 0.8, reason: "dry road" } } });
  assert.equal(r.checks.find((c) => c.key === "photo")?.points, 0);
});

test("a photo already sent by someone else earns nothing", () => {
  const r = scoreReport({ ...quiet, photo: { present: true, takenHoursFromReport: 0, distanceKm: 0, duplicateOfOtherReporter: true, ai: { floodVisible: "yes", confidence: 0.95 } } });
  assert.equal(r.checks.find((c) => c.key === "photo")?.points, 0);
});

test("news history counts anywhere in Nigeria", () => {
  assert.equal(scoreReport({ ...quiet, history: { knownHotspot: false, earlierVerifiedNearby: 0, newsReportsNearby: 3 } }).checks.find((c) => c.key === "history")?.points, 10);
  assert.equal(scoreReport({ ...quiet, history: { knownHotspot: false, earlierVerifiedNearby: 0, newsReportsNearby: 1 } }).checks.find((c) => c.key === "history")?.points, 5);
});

test("one person alone can never verify themselves, even with a photo", () => {
  const r = scoreReport({
    ...quiet,
    rainfall24hMm: 60,
    photo: { present: true, takenHoursFromReport: 0, distanceKm: 0, ai: { floodVisible: "yes", confidence: 0.95 } },
    history: { knownHotspot: true, earlierVerifiedNearby: 3 },
  });
  // sky 25 + photo 20 + history 10 = 55: needs a neighbour or official signal.
  assert.equal(r.score, 55);
  assert.equal(r.status, "LIKELY");
});

test("a photo from far away or long ago earns nothing", () => {
  const r = scoreReport({ ...quiet, photo: { present: true, takenHoursFromReport: 30, distanceKm: 12 } });
  assert.equal(r.checks.find((c) => c.key === "photo")?.points, 0);
});

test("missing rainfall data does not crash and scores zero for the sky", () => {
  const r = scoreReport({ ...quiet, rainfall24hMm: null });
  assert.equal(r.checks.find((c) => c.key === "sky")?.passed, false);
});

test("status thresholds", () => {
  assert.equal(statusFor(VERIFIED_AT), "VERIFIED");
  assert.equal(statusFor(69), "LIKELY");
  assert.equal(statusFor(40), "LIKELY");
  assert.equal(statusFor(39), "UNCONFIRMED");
});

test("score never exceeds 100", () => {
  const r = scoreReport({
    rainfall24hMm: 200, neighbourReports: 50,
    photo: { present: true, takenHoursFromReport: 0, distanceKm: 0, ai: { floodVisible: "yes", confidence: 1 } },
    officialSignal: { present: true }, history: { knownHotspot: true, earlierVerifiedNearby: 9 }, rulerReading: true,
  });
  assert.equal(r.score, 100);
});

test("depth words people actually type", () => {
  assert.equal(parseDepth("knee"), "KNEE");
  assert.equal(parseDepth("2"), "KNEE");
  assert.equal(parseDepth("car roof"), "CAR_ROOF");
  assert.equal(parseDepth("banana"), "UNKNOWN");
});

test("distance between Wuse 2 and Gudu is a few km", () => {
  const km = distanceKm(9.079, 7.481, 9.006, 7.475);
  assert.ok(km > 7 && km < 9, `got ${km}`);
});
