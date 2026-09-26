import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJson, aiEnabled } from "../ai/provider";
import { normalizeVerdict } from "../ai/photo-check";
import { normalizeReadings } from "../ai/news-reader";
import { acceptable } from "../ai/warning-writer";
import { looksLikeQuestion } from "../ai/helper";
import { floodChance, learnPlace, memorySentence, placeKeyFor } from "../street-memory";

test("AI is off without a key, and every job falls back safely", () => {
  delete process.env.FLOODPASS_AI_API_KEY; delete process.env.ANTHROPIC_API_KEY; delete process.env.OPENAI_API_KEY;
  assert.equal(aiEnabled(), false);
  assert.equal(normalizeVerdict(null).source, "none");
});

test("JSON is pulled out of chatty or fenced answers", () => {
  assert.deepEqual(extractJson('Sure! ```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('here: [{"i":0}] done'), [{ i: 0 }]);
  assert.equal(extractJson("no json here"), null);
});

test("photo verdicts are cleaned; screenshots are never trusted", () => {
  const v = normalizeVerdict({ flood_visible: "yes", depth: "knee", confidence: 0.9, reason: "water over road", looks_like_screenshot_or_internet_image: true });
  assert.equal(v.floodVisible, "unsure");
  assert.ok(v.confidence <= 0.3);
  const w = normalizeVerdict({ flood_visible: "yes", depth: "WAIST", confidence: 1.7, reason: "**deep**" });
  assert.equal(w.confidence, 1);
  assert.equal(w.depth, "WAIST");
  assert.ok(!w.reason.includes("*"));
});

test("news readings keep only real state names and map Abuja to FCT", () => {
  const out = normalizeReadings([{ i: 0, kind: "warning", states: ["Kogi", "Abuja", "Atlantis"], places: ["Lokoja"], deaths: null, displaced: "347", confidence: 0.8 }, { i: 1, kind: "nonsense" }], 2);
  assert.deepEqual(out[0]?.states, ["Kogi", "FCT"]);
  assert.equal(out[0]?.displaced, 347);
  assert.equal(out[1], null);
});

test("AI-written warnings must keep the place and the source, and never say safe", () => {
  const parts = { hazard: "Heavy rain", place: "Gudu", window: "from 4pm to 7pm today", source: "NiMet", action: "Move your car to high ground before 4pm." };
  assert.equal(acceptable("FloodPass: Heavy rain in Gudu from 4pm to 7pm today (NiMet). Move your car to high ground.", parts), true);
  assert.equal(acceptable("FloodPass: Heavy rain today. Move your car.", parts), false);
  assert.equal(acceptable("FloodPass: Gudu is safe (NiMet). Enjoy your evening.", parts), false);
});

test("questions are spotted, commands are not", () => {
  assert.equal(looksLikeQuestion("Should I move my car tonight?"), true);
  assert.equal(looksLikeQuestion("wetin I go do if water enter house"), true);
  assert.equal(looksLikeQuestion("water"), false);
});

test("Street Memory learns the rain it takes to flood a place", () => {
  const key = placeKeyFor(9.006, 7.475);
  const obs = [
    { placeKey: key, rainfall24hMm: 38, flooded: true },
    { placeKey: key, rainfall24hMm: 52, flooded: true },
    { placeKey: key, rainfall24hMm: 41, flooded: true },
    { placeKey: key, rainfall24hMm: 20, flooded: false },
    { placeKey: key, rainfall24hMm: 30, flooded: false },
  ];
  const memory = learnPlace(key, obs);
  assert.equal(memory.thresholdMm, 38);
  assert.equal(memory.confidence, "medium");
  assert.equal(floodChance(memory, 45), "likely");
  assert.equal(floodChance(memory, 30), "possible");
  assert.equal(floodChance(memory, 10), "unlikely");
  assert.equal(floodChance(null, 45), "unknown");
  assert.match(memorySentence(memory) ?? "", /3 times/);
});

test("a dry day with more rain than a flood day pushes the threshold up", () => {
  const key = "k";
  const memory = learnPlace(key, [
    { placeKey: key, rainfall24hMm: 12, flooded: true },
    { placeKey: key, rainfall24hMm: 40, flooded: true },
    { placeKey: key, rainfall24hMm: 45, flooded: true },
    { placeKey: key, rainfall24hMm: 15, flooded: false },
    { placeKey: key, rainfall24hMm: 18, flooded: false },
    { placeKey: key, rainfall24hMm: 22, flooded: false },
  ]);
  assert.equal(memory.thresholdMm, 40);
});
