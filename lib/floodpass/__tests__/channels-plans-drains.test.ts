import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac, createVerify, generateKeyPairSync } from "crypto";
import forge from "node-forge";
import { isNigerianPhone, maskPhone, normalizePhone, smsSafe, smsSegments } from "../channels/phone";
import { escapeXml, spellCode, voiceXml } from "../channels/voice-xml";
import { parseUssd, con, end } from "../ussd";
import { codeFromKeypad } from "../ussd-runner";
import { personOnCall } from "../voice-runner";
import { decide, drainCodeIn, type ContactState } from "../conversation";
import { joinForSms, preferredChannel } from "../conversation-runner";
import { findPlaceByName } from "../places";
import { canConfirm, confirmationsNeeded, drainOutcome, heroAlias, rewardFor, REWARD } from "../drain-rules";
import { FREE_ENTITLEMENTS, isNightInNigeria, mergeEntitlements, planByCode, PLANS } from "../billing/plans";
import { readMetadata, validPaystackSignature } from "../billing/paystack";
import { inWarningArea, officialAgencyIn, validateWarning } from "../warnings";
import { addressLevel, addressSummary } from "../address-check";
import { genericObject, signJwtRs256, walletIds } from "../wallet/google";
import { buildPkpass, manifestFor, passJson, readPem } from "../wallet/apple";
import { crc32 } from "../wallet/zip";
import { t } from "../messages";
import type { PublicPass } from "../service";

test("phone numbers become +234...", () => {
  assert.equal(normalizePhone("08031234567"), "+2348031234567");
  assert.equal(normalizePhone("2348031234567"), "+2348031234567");
  assert.equal(normalizePhone("+234 803 123 4567"), "+2348031234567");
  assert.equal(normalizePhone("8031234567"), "+2348031234567");
  assert.equal(normalizePhone("23408031234567"), "+2348031234567");
  assert.equal(normalizePhone("+447700900123"), "+447700900123");
  assert.equal(normalizePhone("hello"), null);
  assert.ok(isNigerianPhone("+2348031234567"));
  assert.equal(maskPhone("+2348031234567"), "+234803***4567");
});

test("SMS stays cheap: plain characters and honest segment counts", () => {
  assert.equal(smsSegments("a".repeat(160)), 1);
  assert.equal(smsSegments("a".repeat(161)), 2);
  assert.equal(smsSegments("naira ₦"), 1); // not in the basic alphabet: 70-character mode
  assert.equal(smsSafe("It’s “deep” – move…"), "It's \"deep\" - move...");
  assert.deepEqual(joinForSms(["one", "two"]), ["one two"]);
  assert.equal(joinForSms(["a".repeat(300), "b".repeat(300)]).length, 2);
});

test("one person, one preferred channel: WhatsApp beats SMS beats voice", () => {
  assert.equal(preferredChannel(null, "ussd"), "sms");
  assert.equal(preferredChannel("sms", "whatsapp"), "whatsapp");
  assert.equal(preferredChannel("whatsapp", "sms"), "whatsapp");
  assert.equal(preferredChannel("voice", "sms"), "sms");
});

test("USSD: a new person agrees, then types their area, in one session", () => {
  const fresh = { consented: false, hasPlace: false };
  assert.equal(parseUssd("", fresh).screen.kind, "consent");
  assert.deepEqual(parseUssd("1", fresh), { screen: { kind: "ask_place", reason: "first" }, consentNow: true });
  assert.deepEqual(parseUssd("1*Gudu Abuja", fresh), { screen: { kind: "set_place", text: "Gudu Abuja" }, consentNow: true });
  assert.equal(parseUssd("2", fresh).screen.kind, "declined");
  assert.equal(parseUssd("9", fresh).screen.kind, "invalid");
});

test("USSD: the main menu for someone we know", () => {
  const known = { consented: true, hasPlace: true };
  assert.equal(parseUssd("", known).screen.kind, "main");
  assert.equal(parseUssd("1", known).screen.kind, "depth");
  assert.deepEqual(parseUssd("1*2", known).screen, { kind: "submit", depth: "KNEE" });
  assert.equal(parseUssd("1*7", known).screen.kind, "invalid");
  assert.equal(parseUssd("2", known).screen.kind, "warnings");
  assert.deepEqual(parseUssd("3*FPABJ7K2Q", known).screen, { kind: "check_code", text: "FPABJ7K2Q" });
  assert.deepEqual(parseUssd("6*D7K2Q", known).screen, { kind: "confirm_drain", text: "D7K2Q" });
  assert.equal(parseUssd("0", known).screen.kind, "stop");
  assert.equal(parseUssd("", { consented: true, hasPlace: false }).screen.kind, "ask_place");
  assert.ok(con("x".repeat(400)).length <= 182 && end("hi").startsWith("END "));
  assert.equal(codeFromKeypad("FPABJ7K2Q"), "FP-ABJ-7K2Q");
  assert.equal(codeFromKeypad("fp abj 7k2q"), "FP-ABJ-7K2Q");
  assert.equal(codeFromKeypad("hello"), null);
});

test("voice: safe XML, key presses, and who is on the call", () => {
  const xml = voiceXml([{ say: "Water <deep> & rising" }, { ask: "Press 1", callbackUrl: "https://x.test/v?key=a&step=menu", numDigits: 1 }]);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?><Response>'));
  assert.ok(xml.includes("Water &lt;deep&gt; &amp; rising"));
  assert.ok(xml.includes('numDigits="1"') && xml.includes("step=menu") && xml.includes("&amp;step"));
  assert.equal(escapeXml(`"'`), "&quot;&apos;");
  assert.equal(spellCode("FP-ABJ-7K2Q"), "F, P, A, B, J, 7, K, 2, Q");
  assert.equal(personOnCall({ isActive: "1", direction: "Outbound", callerNumber: "+2342000000000", destinationNumber: "08031234567" }), "+2348031234567");
  assert.equal(personOnCall({ isActive: "1", direction: "Inbound", callerNumber: "08031234567" }, "+2342000000000"), "+2348031234567");
});

const ready = (channel: ContactState["channel"] = "whatsapp"): ContactState => ({ exists: true, step: "READY", language: "en", hasLocation: true, placeName: "Gudu", pending: null, channel });
const at = new Date().toISOString();

test("WhatsApp and SMS commands: drains, family, places, vault", () => {
  assert.equal(decide(ready(), { kind: "text", text: "DRAIN", at }).set.step, "AWAIT_DRAIN");
  assert.deepEqual(decide(ready("sms"), { kind: "text", text: "DRAIN", at }).replies, ["drainNeedsPhoto"]);
  const drainPhoto = decide({ ...ready(), step: "AWAIT_DRAIN" }, { kind: "image", mediaId: "wa-media:1", at });
  assert.equal(drainPhoto.action.type, "create_drain");
  assert.equal(decide(ready(), { kind: "text", text: "CLEANED D-7K2Q", at }).set.pending?.drainCode, "D-7K2Q");
  const clean = decide({ ...ready(), step: "AWAIT_CLEAN", pending: { startedAt: at, drainCode: "D-7K2Q" } }, { kind: "image", mediaId: "wa-media:2", at });
  assert.deepEqual(clean.action.type === "clean_drain" && clean.action.code, "D-7K2Q");
  assert.deepEqual(decide(ready("sms"), { kind: "text", text: "confirm d 7k2q", at }).action, { type: "confirm_drain", code: "D-7K2Q" });
  assert.equal(decide(ready(), { kind: "text", text: "SAFE", at }).action.type, "safe");
  assert.deepEqual(decide(ready(), { kind: "text", text: "FAMILY 0803 123 4567", at }).action, { type: "add_family", phone: "08031234567" });
  assert.deepEqual(decide(ready(), { kind: "text", text: "FAMILY", at }).replies, ["familyBadPhone"]);
  assert.equal(decide(ready(), { kind: "text", text: "ADD PLACE", at }).set.step, "AWAIT_PLACE");
  assert.equal(decide({ ...ready(), step: "AWAIT_PLACE" }, { kind: "text", text: "Kosofe Lagos", at }).action.type, "add_place_text");
  assert.equal(decide(ready(), { kind: "text", text: "VAULT", at }).set.step, "AWAIT_VAULT");
  assert.equal(decide({ ...ready(), step: "AWAIT_VAULT" }, { kind: "image", mediaId: "wa-media:3", at }).action.type, "save_vault");
  assert.equal(decide({ ...ready(), step: "AWAIT_VAULT" }, { kind: "text", text: "cancel", at }).set.step, "READY");
  assert.equal(decide(ready(), { kind: "text", text: "points", at }).action.type, "points");
  assert.equal(decide(ready(), { kind: "text", text: "reward", at }).action.type, "reward");
  assert.equal(drainCodeIn("please check D-7K2Q now"), "D-7K2Q");
});

test("typed places: SMS users can join without a map pin", () => {
  const location: ContactState = { exists: true, step: "LOCATION", language: "en", hasLocation: false, placeName: null, pending: null, channel: "sms" };
  assert.deepEqual(decide(location, { kind: "text", text: "Gudu Abuja", at }).action, { type: "find_place", text: "Gudu Abuja" });
  assert.deepEqual(decide(ready("sms"), { kind: "text", text: "Kosofe Lagos", at }).action, { type: "find_place", text: "Kosofe Lagos" });

  const registry = [
    { name: "Kosofe", state: "Lagos", latitude: 6.59, longitude: 3.4 },
    { name: "Surulere", state: "Lagos", latitude: 6.5, longitude: 3.35 },
    { name: "Surulere", state: "Oyo", latitude: 8.1, longitude: 4.4 },
  ];
  assert.equal(findPlaceByName("Gudu Abuja", registry)?.from, "hotspot");
  assert.equal(findPlaceByName("kosofe, lagos", registry)?.name, "Kosofe");
  assert.equal(findPlaceByName("Surulere Oyo", registry)?.state, "Oyo");
  const kano = findPlaceByName("Kano", registry);
  assert.equal(kano?.from, "capital");
  assert.equal(kano?.state, "Kano");
  assert.equal(findPlaceByName("zzzz qqqq", registry), null);
});

test("Drain Heroes rules: photos and neighbours, never double points", () => {
  assert.equal(confirmationsNeeded(null), 2);
  assert.equal(confirmationsNeeded({ cleared: "yes", sameDrain: "yes", confidence: 0.8 }), 1);
  assert.equal(confirmationsNeeded({ cleared: "no", sameDrain: "unsure", confidence: 0.9 }), 3);
  assert.equal(drainOutcome({ beforeHash: "a", afterHash: "a", confirmations: 5, ai: null }).outcome, "REJECTED");
  assert.equal(drainOutcome({ beforeHash: "a", afterHash: "b", confirmations: 1, ai: null }).outcome, "CLEANED");
  assert.equal(drainOutcome({ beforeHash: "a", afterHash: "b", confirmations: 2, ai: null }).outcome, "VERIFIED");
  const base = { confirmerKey: "n", reportedByKey: "r", cleanedByKey: "c", status: "CLEANED", distanceKm: 0.2, confirmationsToday: 0 };
  assert.equal(canConfirm(base), "ok");
  assert.equal(canConfirm({ ...base, confirmerKey: "c" }), "own");
  assert.equal(canConfirm({ ...base, distanceKm: 2 }), "far");
  assert.equal(canConfirm({ ...base, distanceKm: 2, approximatePlace: true }), "ok");
  assert.equal(canConfirm({ ...base, confirmationsToday: 5 }), "limit");
  assert.equal(canConfirm({ ...base, status: "BLOCKED" }), "not-cleaned");
  assert.deepEqual(rewardFor(250, 0), { units: 2, naira: 2 * REWARD.nairaPerUnit, points: 2 * REWARD.pointsPerUnit });
  assert.equal(rewardFor(10_000, REWARD.maxNairaPer30Days).naira, 0);
  assert.equal(heroAlias("abcdef"), "Hero ABCD");
});

test("plans: free is the floor, extras merge, night is West Africa Time", () => {
  assert.deepEqual(mergeEntitlements([]), FREE_ENTITLEMENTS);
  const merged = mergeEntitlements(["FARMER", "FAMILY_PLUS"]);
  assert.equal(merged.maxPlaces, 5);
  assert.ok(merged.nightCall && merged.safe && merged.vault);
  assert.equal(planByCode("protect")?.status, "waitlist");
  assert.ok(PLANS.every((p) => p.amountKobo >= 0 && p.gets.length > 0));
  assert.ok(isNightInNigeria(new Date("2026-09-25T22:30:00Z"))); // 23:30 in Lagos
  assert.ok(!isNightInNigeria(new Date("2026-09-25T07:00:00Z"))); // 08:00 in Lagos
});

test("Paystack webhooks: only a correct HMAC-SHA512 signature passes", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "x" } });
  const good = createHmac("sha512", "sk_test_123").update(body).digest("hex");
  assert.ok(validPaystackSignature(body, good, "sk_test_123"));
  assert.ok(!validPaystackSignature(body, good, "sk_test_other"));
  assert.ok(!validPaystackSignature(`${body} `, good, "sk_test_123"));
  assert.ok(!validPaystackSignature(body, null, "sk_test_123"));
  assert.deepEqual(readMetadata('{"floodpass_plan":"farmer_season"}'), { floodpass_plan: "farmer_season" });
  assert.deepEqual(readMetadata(null), {});
});

test("warnings: official source and link required, never 'safe', area checks", () => {
  const bad = validateWarning({ hazard: "Heavy rain", placeLabel: "Gudu", window: "tonight", source: "NiMet", action: "You are safe indoors", areaType: "RADIUS", latitude: 9, longitude: 7.4, radiusKm: 3 });
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.ok(bad.problems.some((p) => p.includes("link")));
    assert.ok(bad.problems.some((p) => p.includes("safe")));
  }
  const good = validateWarning({ hazard: "Heavy rain", placeLabel: "Gudu", window: "tonight", source: "NiMet", sourceUrl: "https://nimet.gov.ng/x", action: "Move cars to high ground", areaType: "STATE", states: ["FCT", "Atlantis"] });
  assert.equal(good.ok, true);
  if (good.ok) assert.deepEqual(good.value.states, ["FCT"]);
  const radius = { areaType: "RADIUS", latitude: 9.0, longitude: 7.47, radiusKm: 2, state: null };
  assert.ok(inWarningArea(radius, { latitude: 9.005, longitude: 7.475, state: null }));
  assert.ok(!inWarningArea(radius, { latitude: 9.2, longitude: 7.47, state: null }));
  assert.ok(inWarningArea({ areaType: "STATE", latitude: null, longitude: null, radiusKm: null, state: "Kogi,Benue" }, { latitude: null, longitude: null, state: "Benue" }));
  assert.equal(officialAgencyIn("NIHSA warns 30 states of floods", "https://example.com"), "NIHSA");
  assert.equal(officialAgencyIn("Heavy rain in town", "https://nimet.gov.ng/notice"), "NiMet");
  assert.equal(officialAgencyIn("Heavy rain in town", "https://example.com"), null);
});

test("Rent and Land Check: honest levels, never 'safe'", () => {
  assert.equal(addressLevel({ verifiedFloods: 0, hotspotWithinM: null, newsFloods: 0 }), "NONE_FOUND_YET");
  assert.equal(addressLevel({ verifiedFloods: 1, hotspotWithinM: null, newsFloods: 0 }), "SOME_FLOODS_KNOWN");
  assert.equal(addressLevel({ verifiedFloods: 1, hotspotWithinM: 200, newsFloods: 0 }), "MANY_FLOODS_KNOWN");
  for (const level of ["MANY_FLOODS_KNOWN", "SOME_FLOODS_KNOWN", "NONE_FOUND_YET"] as const) {
    assert.ok(!/\bsafe\b/i.test(addressSummary(level, "Gudu")));
  }
});

const PASS: PublicPass = {
  code: "FP-ABJ-7K2Q", status: "VERIFIED", placeName: "Ebeano-Gudu Road, Gudu", state: "FCT", depth: "WAIST", depthWords: "waist deep",
  floodedAt: "2026-08-16T17:00:00.000Z", issuedAt: "2026-08-16T18:00:00.000Z", checksPassed: 5, checksTotal: 6, seeded: false, sequence: 1,
};

test("Google Wallet: a correctly signed save link and pass object", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const jwt = signJwtRs256({ aud: "google", typ: "savetowallet" }, pem);
  const [head, body, signature] = jwt.split(".");
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${head}.${body}`);
  assert.ok(verifier.verify(publicKey, Buffer.from(signature, "base64url")));
  assert.equal(JSON.parse(Buffer.from(head, "base64url").toString()).alg, "RS256");
  const object = genericObject(PASS, "https://x.test/check?code=FP-ABJ-7K2Q", "https://x.test", "3388000000012345678");
  assert.equal(object.id, "3388000000012345678.FP-ABJ-7K2Q");
  assert.equal(object.barcode.type, "QR_CODE");
  assert.equal(walletIds("FP-ABJ-7K2Q", "1").classId, "1.floodpass_v1");
});

test("Apple Wallet: a real .pkpass zip with manifest and PKCS#7 signature", () => {
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const make = (cn: string) => {
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = "01";
    cert.validity.notBefore = new Date(Date.now() - 86_400_000);
    cert.validity.notAfter = new Date(Date.now() + 86_400_000);
    cert.setSubject([{ name: "commonName", value: cn }]);
    cert.setIssuer([{ name: "commonName", value: cn }]);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    return forge.pki.certificateToPem(cert);
  };
  const certPem = make("Pass Type ID: pass.test.floodpass");
  const wwdrPem = make("Test WWDR");
  const keyPem = forge.pki.privateKeyToPem(keys.privateKey);
  assert.equal(readPem(Buffer.from(certPem).toString("base64")), certPem);
  const file = buildPkpass(PASS, "https://x.test/check?code=FP-ABJ-7K2Q", { passTypeIdentifier: "pass.test.floodpass", teamIdentifier: "ABCDE12345", certPem, keyPem, wwdrPem });
  assert.equal(file.readUInt32LE(0), 0x04034b50);
  const text = file.toString("latin1");
  for (const name of ["pass.json", "manifest.json", "signature", "icon.png", "icon@2x.png", "logo.png"]) assert.ok(text.includes(name), name);
  const json = passJson(PASS, "https://x.test/c", { passTypeIdentifier: "p", teamIdentifier: "t" });
  assert.equal(json.formatVersion, 1);
  assert.equal(json.barcodes[0].format, "PKBarcodeFormatQR");
  const manifest = manifestFor({ "a.txt": Buffer.from("hi") });
  assert.equal(manifest["a.txt"], createHash("sha1").update("hi").digest("hex"));
});

test("every message exists in English and Pidgin, with no asterisks or em dashes", () => {
  const keys = ["welcome", "help", "helpSms", "drainAsk", "drainSaved", "cleanSaved", "confirmFar", "points", "rewardAsked", "safeSent", "safeMessage", "planNeeded", "placeAdded", "vaultAsk", "vaultLinks", "placeNotFound", "locationSms", "plansInfo"];
  for (const key of keys) {
    for (const lang of ["en", "pcm"] as const) {
      const value = t(lang, key, { code: "D-7K2Q", place: "Gudu", points: 5, url: "https://x.test", text: "x", per: 100, naira: 200, count: 1, max: 5, min: 100, links: "l", name: "n", time: "t", phone: "p", list: "a" });
      assert.notEqual(value, key, `${lang}.${key} is missing`);
      assert.ok(!value.includes("*"), `${lang}.${key} has an asterisk`);
      assert.ok(!value.includes("—"), `${lang}.${key} has an em dash`);
    }
  }
});
