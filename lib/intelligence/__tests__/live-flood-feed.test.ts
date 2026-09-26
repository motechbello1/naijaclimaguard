import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, extractLocations, looksForeign, stripSourceSuffix } from "../live-flood-feed";

test("a multi-state NEMA warning is tagged with every state, including Kogi", () => {
  const loc = extractLocations("NEMA: Kogi, Anambra, Benue, 13 other states risk high flooding");
  assert.deepEqual([...loc.states].sort(), ["Anambra", "Benue", "Kogi"]);
});

test("an at-risk list is a warning, not a report of damage", () => {
  assert.equal(classify("NEMA: Kogi, Anambra, Benue, 13 other states risk high flooding").status, "WARNING");
  assert.equal(classify("Residents stranded, cars submerged as flash flood hits parts of Abuja").status, "REPORTED");
});

test("the Google News source suffix is removed before judging the headline", () => {
  assert.equal(stripSourceSuffix("Scholz visits flooded southwest Germany - The Guardian Nigeria News", "The Guardian Nigeria News"), "Scholz visits flooded southwest Germany");
});

test("foreign floods are recognised", () => {
  assert.equal(looksForeign("Scholz visits flooded southwest Germany"), true);
  assert.equal(looksForeign("Heavy rains cause flooding along Han River near Seoul"), true);
  assert.equal(looksForeign("Residents stranded as flood hits Gudu"), false);
});

test("Abuja districts map to the FCT", () => {
  assert.equal(extractLocations("Flood submerges cars in Gudu and Utako").state, "FCT");
});
