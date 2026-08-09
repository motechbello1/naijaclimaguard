const base = (process.env.NAIJACLIMAGUARD_BASE_URL || "https://naijaclimaguard.vercel.app").replace(/\/$/, "");

let failed = 0;
const pass = (label) => console.log(`PASS: ${label}`);
const fail = (label, detail = "") => { failed += 1; console.error(`FAIL: ${label}${detail ? ` — ${detail}` : ""}`); };

async function fetchText(path) {
  const response = await fetch(`${base}${path}`, { redirect: "follow", cache: "no-store" });
  return { response, text: await response.text() };
}

async function expectAnonymous401(path, label) {
  const response = await fetch(`${base}${path}`, { redirect: "manual", cache: "no-store" });
  if (response.status === 401) pass(label);
  else fail(label, `expected 401, got ${response.status}`);
}

async function main() {
  const home = await fetchText("/");
  home.response.ok ? pass("Homepage responds") : fail("Homepage responds", String(home.response.status));
  home.text.includes("NaijaClimaGuard") ? pass("Homepage identifies product") : fail("Homepage identifies product");
  home.text.includes("No government-advantage or fixed lead-time claim is published")
    ? pass("Homepage keeps lead-time claim withdrawn")
    : fail("Homepage keeps lead-time claim withdrawn");

  const how = await fetchText("/how-to-use");
  how.response.ok ? pass("How-to-Use responds") : fail("How-to-Use responds", String(how.response.status));
  for (const phrase of ["0.9928", "99.28", "48 hours before government", "tamper-proof"]) {
    how.text.toLowerCase().includes(phrase.toLowerCase())
      ? fail(`Withdrawn claim absent from live How-to-Use: ${phrase}`)
      : pass(`Withdrawn claim absent from live How-to-Use: ${phrase}`);
  }
  how.text.includes("Model v5 is being evaluated separately")
    ? pass("Live How-to-Use separates Model v5 from production")
    : fail("Live How-to-Use separates Model v5 from production");
  how.text.includes("Never use a low NaijaClimaGuard score to ignore an official warning")
    ? pass("Live emergency precedence wording exists")
    : fail("Live emergency precedence wording exists");

  const riskResponse = await fetch(`${base}/api/v1/risk?latitude=7.8023&longitude=6.7333`, { cache: "no-store" });
  if (!riskResponse.ok) {
    fail("Risk API responds", String(riskResponse.status));
  } else {
    pass("Risk API responds");
    const risk = await riskResponse.json();
    risk?.meta?.model === "derived-v2" ? pass("Risk API identifies current public engine") : fail("Risk API identifies current public engine");
    risk?.safety_state && typeof risk.safety_state.active === "boolean"
      ? pass("Risk API returns independent safety_state")
      : fail("Risk API returns independent safety_state");
    String(risk?.meta?.model_status || "").includes("Model v5")
      ? pass("Risk API explicitly separates Model v5 validation")
      : fail("Risk API explicitly separates Model v5 validation");
    String(risk?.meta?.source_note || "").includes("never alter the score")
      ? pass("Official advisory overlay cannot rewrite model score")
      : fail("Official advisory overlay cannot rewrite model score");
  }

  const dashboard = await fetchText("/dashboard");
  dashboard.response.ok ? pass("Dashboard shell responds") : fail("Dashboard shell responds", String(dashboard.response.status));
  dashboard.text.includes("ClimaGuard Assistant") ? pass("Assistant surface is present") : fail("Assistant surface is present");

  await expectAnonymous401("/api/locations", "Saved locations reject anonymous access");
  await expectAnonymous401("/api/alerts", "Alert rules reject anonymous access");
  await expectAnonymous401("/api/profile/delivery", "Delivery preferences reject anonymous access");
  await expectAnonymous401("/api/agency/command", "Agency command queue rejects anonymous access");
  await expectAnonymous401("/api/v1/intelligence/health", "Enterprise intelligence health rejects anonymous access");

  if (failed) {
    console.error(`\nProduction smoke failed: ${failed} issue(s).`);
    process.exit(1);
  }
  console.log("\nProduction smoke passed. This verifies public deployment surfaces and anonymous auth boundaries only; signed-in workflow behavior and partner-feed field operation require separate evidence.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
