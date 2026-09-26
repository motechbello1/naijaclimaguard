import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, type ContactState } from "../conversation";
import { buildWarning, t } from "../messages";
import { parseWebhook, validSignature } from "../whatsapp";
import { createHmac } from "crypto";

const at = "2026-09-25T10:00:00.000Z";
const base: ContactState = { exists: true, step: "READY", language: "en", hasLocation: true, placeName: "Gudu", pending: null };

test("a stranger saying hi is welcomed and asked for consent", () => {
  const d = decide({ ...base, exists: false, step: "NEW" }, { kind: "text", text: "Hi", at });
  assert.equal(d.action.type, "create_contact");
  assert.deepEqual(d.replies, ["welcome"]);
  assert.equal(d.set.step, "CONSENT");
});

test("no consent, no signing up", () => {
  const d = decide({ ...base, step: "CONSENT" }, { kind: "text", text: "what is this", at });
  assert.deepEqual(d.replies, ["consentAgain"]);
  assert.equal(d.set.step, undefined);
});

test("yes leads to language, then location, then ready", () => {
  assert.equal(decide({ ...base, step: "CONSENT" }, { kind: "text", text: "yes", at }).set.step, "LANGUAGE");
  const lang = decide({ ...base, step: "LANGUAGE", hasLocation: false }, { kind: "text", text: "2", at });
  assert.equal(lang.set.language, "pcm");
  assert.equal(lang.set.step, "LOCATION");
  const loc = decide({ ...base, step: "LOCATION", hasLocation: false }, { kind: "location", latitude: 9.006, longitude: 7.475, at });
  assert.equal(loc.action.type, "save_location");
  assert.equal(loc.set.step, "READY");
});

test("typing a place name instead of sending a pin looks the place up", () => {
  assert.deepEqual(decide({ ...base, step: "LOCATION", hasLocation: false }, { kind: "text", text: "Gudu", at }).action, { type: "find_place", text: "Gudu" });
  assert.deepEqual(decide({ ...base, step: "LOCATION", hasLocation: false }, { kind: "text", text: "ok", at }).replies, ["location"]);
});

test("WATER, then a depth number, submits a report", () => {
  const first = decide(base, { kind: "text", text: "water", at });
  assert.equal(first.set.step, "AWAIT_DEPTH");
  const second = decide({ ...base, step: "AWAIT_DEPTH", pending: first.set.pending ?? null }, { kind: "text", text: "2", at });
  assert.equal(second.action.type, "submit_report");
  if (second.action.type === "submit_report") assert.equal(second.action.depth, "KNEE");
});

test("a photo starts a report and is kept with it", () => {
  const d = decide(base, { kind: "image", mediaId: "wa-media:123", at });
  assert.equal(d.set.step, "AWAIT_DEPTH");
  assert.equal(d.set.pending?.photoRef, "wa-media:123");
});

test("a FloodPass code in any message is checked", () => {
  const d = decide(base, { kind: "text", text: "pls check fp abj 7k2q", at });
  assert.equal(d.action.type, "check_code");
  if (d.action.type === "check_code") assert.equal(d.action.code, "FP-ABJ-7K2Q");
});

test("STOP always works, even mid-report", () => {
  const d = decide({ ...base, step: "AWAIT_DEPTH" }, { kind: "text", text: "STOP", at });
  assert.equal(d.action.type, "delete_contact");
});

test("warnings carry all five parts and no asterisks", () => {
  const text = buildWarning("en", { hazard: "Heavy rain", place: "Gudu", window: "from 4pm to 7pm today", source: "NiMet", history: "Ebeano-Gudu Road flooded in rain like this before.", action: "Move your car to high ground before 4pm.", avoid: "the Gaduwa-Durumi bridge" });
  for (const part of ["Heavy rain", "Gudu", "4pm to 7pm", "NiMet", "Move your car", "Avoid the Gaduwa-Durumi bridge", "Forward this"]) assert.ok(text.includes(part), part);
  assert.ok(!text.includes("*"));
  assert.ok(!t("pcm", "verified", { code: "FP-ABJ-7K2Q", url: "x" }).includes("*"));
});

test("webhook signature check", () => {
  const body = JSON.stringify({ hello: "world" });
  const sig = "sha256=" + createHmac("sha256", "s3cret").update(body).digest("hex");
  assert.equal(validSignature(body, sig, "s3cret"), true);
  assert.equal(validSignature(body, sig, "wrong"), false);
  assert.equal(validSignature(body, null, "s3cret"), false);
});

test("webhook parsing: text, location and image", () => {
  const payload = { entry: [{ changes: [{ value: { messages: [
    { from: "2348012345678", timestamp: "1790000000", type: "text", text: { body: "hi" } },
    { from: "2348012345678", timestamp: "1790000001", type: "location", location: { latitude: 9.0, longitude: 7.4, name: "Home" } },
    { from: "2348012345678", timestamp: "1790000002", type: "image", image: { id: "M1", caption: "water" } },
  ] } }] }] };
  const parsed = parseWebhook(payload);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].message.kind, "text");
  assert.equal(parsed[1].message.kind, "location");
  assert.equal(parsed[2].message.kind, "image");
});
