import { test } from "node:test";
import assert from "node:assert/strict";
import { GENESIS_HASH, canonicalJson, generatePassCode, looksLikePassCode, normalizePassCode, sealEntry, verifyChain, type LedgerEntry, type LedgerFacts } from "../ledger";

function facts(sequence: number, code: string): LedgerFacts {
  return { sequence, code, placeName: "Ebeano-Gudu Road, Gudu", state: "FCT", latitude: 9.006, longitude: 7.475, depth: "KNEE", floodedAt: "2026-08-16T17:40:00.000Z", score: 80, engineVersion: "truth-engine-v1" };
}

function chain(n: number): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  let prev = GENESIS_HASH;
  for (let i = 1; i <= n; i += 1) { const e = sealEntry(facts(i, `FP-ABJ-${"ABCDEFGH"[i]}${"2345678"[i % 7]}ZZ`), prev); out.push(e); prev = e.hash; }
  return out;
}

test("canonical JSON ignores key order", () => {
  assert.equal(canonicalJson({ b: 1, a: [2, { d: 3, c: 4 }] }), canonicalJson({ a: [2, { c: 4, d: 3 }], b: 1 }));
});

test("an untouched chain checks out", () => {
  const result = verifyChain(chain(5));
  assert.equal(result.intact, true);
  assert.equal(result.checked, 5);
});

test("changing one page breaks the chain at that page", () => {
  const entries = chain(5);
  entries[2] = { ...entries[2], depth: "WAIST" };
  const result = verifyChain(entries);
  assert.equal(result.intact, false);
  assert.equal(result.brokenAtSequence, 3);
});

test("removing a page is noticed", () => {
  const entries = chain(5);
  entries.splice(1, 1);
  assert.equal(verifyChain(entries).intact, false);
});

test("codes look right and avoid look-alike letters", () => {
  for (let i = 0; i < 200; i += 1) {
    const code = generatePassCode("FCT");
    assert.match(code, /^FP-ABJ-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}$/);
    assert.equal(looksLikePassCode(code), true);
  }
  assert.match(generatePassCode("Kogi"), /^FP-KOG-/);
  assert.match(generatePassCode(null), /^FP-NGA-/);
});

test("people can type codes loosely", () => {
  assert.equal(normalizePassCode(" fp-abj-7k2q "), "FP-ABJ-7K2Q");
  assert.equal(looksLikePassCode("FP-ABJ-7K2Q"), true);
  assert.equal(looksLikePassCode("FP-ABJ-0O1I"), false);
});
