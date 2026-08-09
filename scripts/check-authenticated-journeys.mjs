import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
let failed = 0;
const pass = (label) => console.log(`PASS: ${label}`);
const fail = (label, file) => { failed += 1; console.error(`FAIL: ${label}${file ? ` (${file})` : ""}`); };
const requireText = (file, label, needle) => read(file).includes(needle) ? pass(label) : fail(label, file);
const forbidText = (file, label, needle) => !read(file).includes(needle) ? pass(label) : fail(label, file);

const dashboard = "components/dashboard/AdaptiveDashboard.tsx";
requireText(dashboard, "Household has distinct dashboard copy", 'HOUSEHOLD: { title: "My Safety"');
requireText(dashboard, "Farmer has distinct dashboard copy", 'FARMER: { title: "My Farm Risk"');
requireText(dashboard, "Business has distinct dashboard copy", 'BUSINESS: { title: "Business Risk Overview"');
requireText(dashboard, "Agency has distinct dashboard copy", 'AGENCY: { title: "Operations Overview"');
requireText(dashboard, "Business and Agency receive multi-source operational panel", 'role === "BUSINESS" || role === "AGENCY"');
requireText(dashboard, "Simple mode removes analyst-style risk grid", 'mode === "simple" ?');
requireText(dashboard, "Simple mode tells users they need not understand weather numbers", 'You do not need to understand weather numbers.');
requireText(dashboard, "Official advisory visually overrides simple risk label", 'official ? "OFFICIAL WARNING" : plainRiskLabel(risk.level)');

const explanation = "components/shared/ExplanationMode.tsx";
requireText(explanation, "Three explanation levels are explicit", 'export type ExplanationMode = "simple" | "standard" | "technical"');
requireText(explanation, "Explanation level persists across navigation", 'naijaclimaguard:explanation-mode');
requireText(explanation, "Ground reports are not auto-promoted to model labels", 'user reports are not automatically treated as validated model labels');
requireText(explanation, "Outlook is explicitly not a precise flood prediction", 'this is not a precise flood prediction');

const locations = "app/api/locations/route.ts";
requireText(locations, "Locations require server session", 'if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })');
requireText(locations, "Location deletion is scoped to current user", 'where: { id, userId: user.id }');
requireText(locations, "Plan location limits are enforced server-side", 'PLAN_LIMITS');

const alerts = "app/api/alerts/route.ts";
requireText(alerts, "Alerts require server session", 'if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })');
requireText(alerts, "Phone alert channels require a verified phone", 'Verify your phone number before creating phone-based alerts.');
requireText(alerts, "Alert location must belong to current user", 'where: { id: locationId, userId: user.id }');
requireText(alerts, "Alert updates are scoped to current user", 'where: { id, userId: user.id }');

const delivery = "app/api/profile/delivery/route.ts";
requireText(delivery, "Platform and alert languages are independent API fields", 'platformLanguage');
requireText(delivery, "Preferred alert language remains separate", 'preferredLanguage');
requireText(delivery, "Changing phone revokes verification", 'phoneVerifiedAt = null');
requireText(delivery, "Changing phone disables SMS", 'smsEnabled = false');
requireText(delivery, "Changing phone disables WhatsApp", 'whatsappEnabled = false');
requireText(delivery, "Changing phone disables voice", 'voiceEnabled = false');
requireText(delivery, "Phone delivery cannot be enabled before verification", 'Verify your phone number before enabling SMS, WhatsApp or voice alerts.');

const command = "app/api/agency/command/route.ts";
requireText(command, "Agency command requires Enterprise plan", 'account.plan !== "ENTERPRISE"');
requireText(command, "Agency command only accepts canonical official advisories", 'sourceKind: IntelligenceSourceKind.OFFICIAL_ADVISORY');
requireText(command, "Stale advisories cannot be newly actioned", 'This official advisory is stale and cannot be newly actioned.');
requireText(command, "Command workflow has acknowledge action", '"ACKNOWLEDGE"');
requireText(command, "Command workflow has escalate action", '"ESCALATE"');
requireText(command, "Command workflow has resolve action", '"RESOLVE"');
requireText(command, "Command actions append evidence events", 'appendEvidenceEvent');

const health = "app/api/v1/intelligence/health/route.ts";
requireText(health, "Intelligence source health requires session", 'if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })');
requireText(health, "Intelligence source health requires Enterprise", 'account.plan !== "ENTERPRISE"');
requireText(health, "Missing source data is represented explicitly", 'status: "missing" as const');
requireText(health, "Stale source data is represented explicitly", 'status: "stale" as const');

const evidence = "lib/evidence/ledger.ts";
requireText(evidence, "Evidence events use SHA-256 fingerprints", 'createHash("sha256")');
requireText(evidence, "Evidence chain carries previous hash", 'previousHash: previous?.eventHash ?? null');
requireText(evidence, "Evidence hashes are computed from stable immutable payload", 'const eventHash = fingerprint(immutable)');
requireText(evidence, "Evidence writes occur in a database transaction", 'prisma.$transaction');
requireText(evidence, "Evidence has a deterministic verification function", 'export function verifyEvidenceWindow');
requireText(evidence, "Verifier checks stored hash against recomputed hash", 'expectedHash !== event.eventHash');
requireText(evidence, "Verifier checks previous-hash linkage", 'event.previousHash !== previous.eventHash');

const evidenceRoute = "app/api/evidence/events/route.ts";
requireText(evidenceRoute, "Evidence API requires authentication", 'if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })');
requireText(evidenceRoute, "Client evidence types are explicitly restricted", 'USER_ASSERTABLE_EVENT_TYPES');
requireText(evidenceRoute, "User clients cannot claim system delivery evidence", 'This evidence event can only be recorded by a trusted server workflow.');
requireText(evidenceRoute, "User-asserted evidence is provenance-labelled", 'evidenceProvenance: "user_asserted"');
requireText(evidenceRoute, "User-asserted entries cannot claim server model identity", 'modelLabel: "user-asserted"');
requireText(evidenceRoute, "Evidence GET returns chain verification", 'verifyEvidenceWindow(user.id, events)');
requireText(evidenceRoute, "Evidence window truncation is disclosed", 'windowTruncated: totalEvents > events.length');

const i18n = "lib/i18n/config.ts";
requireText(i18n, "English supported", '"en"');
requireText(i18n, "Pidgin supported", '"pcm"');
requireText(i18n, "Hausa supported", '"ha"');
requireText(i18n, "Yoruba supported", '"yo"');
requireText(i18n, "Igbo supported", '"ig"');

const assistant = "lib/assistant/knowledge.ts";
requireText(assistant, "Assistant can answer flood definitions", '"flood_definition"');
requireText(assistant, "Assistant distinguishes Model v5 from production", 'Model v5 is still being validated');
requireText(assistant, "Assistant unclear fallback asks for clarification", 'I am not sure which part you mean.');

const how = "app/how-to-use/page.tsx";
for (const withdrawn of ["0.9928", "99.28", "48 hours before government", "tamper-proof"]) {
  forbidText(how, `Withdrawn public claim remains absent: ${withdrawn}`, withdrawn);
}
requireText(how, "How-to-Use warns against overriding official warnings", 'Never use a low NaijaClimaGuard score');
requireText(how, "How-to-Use discloses derived-v2 as current public engine", 'derived-v2');

if (failed) {
  console.error(`\nAuthenticated journey contract failed: ${failed} issue(s).`);
  process.exit(1);
}
console.log("\nAuthenticated journey contract passed. This proves implementation invariants, not signed-in browser execution or field validation.");
