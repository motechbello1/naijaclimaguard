import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const requiredFiles = [
  "components/dashboard/AdaptiveDashboard.tsx",
  "components/dashboard/MultiSourceIntelligencePanel.tsx",
  "components/shared/AppShell.tsx",
  "components/shared/GlobalAccessibilityDock.tsx",
  "components/shared/SpeechProvider.tsx",
  "components/assistant/FloodAssistant.tsx",
  "lib/assistant/knowledge.ts",
  "lib/i18n/config.ts",
  "prisma/schema.prisma",
  "app/how-to-use/page.tsx",
];

let failed = 0;
const pass = (label) => console.log(`PASS: ${label}`);
const fail = (label) => { failed += 1; console.error(`FAIL: ${label}`); };
const assertContains = (file, needle, label) => {
  if (!exists(file)) return fail(`${label} — missing ${file}`);
  const source = read(file);
  source.includes(needle) ? pass(label) : fail(`${label} — missing invariant: ${needle}`);
};
const assertAbsent = (files, phrase, label) => {
  const hits = files.filter(exists).filter((file) => read(file).toLowerCase().includes(phrase.toLowerCase()));
  hits.length ? fail(`${label} — found in ${hits.join(", ")}`) : pass(label);
};

for (const file of requiredFiles) exists(file) ? pass(`Required TRL6 surface exists: ${file}`) : fail(`Required TRL6 surface missing: ${file}`);

// Role-specific UX: the same analytics dashboard must not be the only experience.
assertContains("components/dashboard/AdaptiveDashboard.tsx", 'HOUSEHOLD: { title: "My Safety"', "Household dashboard contract exists");
assertContains("components/dashboard/AdaptiveDashboard.tsx", 'FARMER: { title: "My Farm Risk"', "Farmer dashboard contract exists");
assertContains("components/dashboard/AdaptiveDashboard.tsx", 'BUSINESS: { title: "Business Risk Overview"', "Business dashboard contract exists");
assertContains("components/dashboard/AdaptiveDashboard.tsx", 'AGENCY: { title: "Operations Overview"', "Agency dashboard contract exists");
assertContains("components/dashboard/AdaptiveDashboard.tsx", 'Derived-v2 · Open-Meteo', "Production dashboard still identifies the current public engine");
assertContains("components/dashboard/AdaptiveDashboard.tsx", 'OFFICIAL WARNING', "Official warning is visually distinct from model risk");

// Source honesty and operational fusion.
assertContains("components/dashboard/MultiSourceIntelligencePanel.tsx", 'fetch("/api/v1/intelligence/health"', "Enterprise dashboard reads canonical partner-source health");
assertContains("components/dashboard/MultiSourceIntelligencePanel.tsx", 'Missing sources reduce confidence; they are never silently treated as normal or safe conditions.', "Missing-source safety rule is explicit");
assertContains("components/dashboard/MultiSourceIntelligencePanel.tsx", 'an authenticated official emergency warning overrides a low model score', "Official-warning precedence is explicit");
assertContains("components/dashboard/MultiSourceIntelligencePanel.tsx", 'Integration-ready does not mean connected.', "Integration readiness cannot masquerade as a live feed");

// Evidence, command and last-mile delivery are real schema capabilities.
assertContains("prisma/schema.prisma", "model EvidenceEvent", "Evidence ledger schema exists");
assertContains("prisma/schema.prisma", "eventHash     String    @unique", "Evidence events have unique hashes");
assertContains("prisma/schema.prisma", "model IntelligenceSource", "Canonical intelligence source schema exists");
assertContains("prisma/schema.prisma", "OFFICIAL_GAUGE", "Official gauge source kind exists");
assertContains("prisma/schema.prisma", "DAM_OPERATION", "Dam-operation source kind exists");
assertContains("prisma/schema.prisma", "OFFICIAL_ADVISORY", "Official advisory source kind exists");
assertContains("prisma/schema.prisma", "model AgencyCommandCase", "Agency command-case schema exists");
assertContains("prisma/schema.prisma", 'status          String                  @default("RECEIVED")', "Agency command cases start RECEIVED");
assertContains("prisma/schema.prisma", "acknowledgedAt  DateTime?", "Agency acknowledgement evidence exists");
assertContains("prisma/schema.prisma", "escalatedAt     DateTime?", "Agency escalation evidence exists");
assertContains("prisma/schema.prisma", "resolvedAt      DateTime?", "Agency resolution evidence exists");
assertContains("prisma/schema.prisma", "model DeliveryPreference", "Delivery preference schema exists");
assertContains("prisma/schema.prisma", "phoneVerifiedAt   DateTime?", "Phone verification is persisted");
assertContains("prisma/schema.prisma", "smsEnabled        Boolean  @default(false)", "SMS is opt-in by default");
assertContains("prisma/schema.prisma", "whatsappEnabled   Boolean  @default(false)", "WhatsApp is opt-in by default");
assertContains("prisma/schema.prisma", "voiceEnabled      Boolean  @default(false)", "Voice is opt-in by default");
assertContains("prisma/schema.prisma", "codeHash   String", "OTP plaintext is not a schema field");

// Platform and alert language must be independent.
assertContains("prisma/schema.prisma", 'platformLanguage  String   @default("ENGLISH")', "Platform language persists independently");
assertContains("prisma/schema.prisma", 'preferredLanguage String   @default("ENGLISH")', "Alert language persists independently");
assertContains("lib/i18n/config.ts", '"en" | "pcm" | "ha" | "yo" | "ig"', "Five first-wave platform languages remain configured");

// Mobile/accessibility invariants.
assertContains("components/shared/AppShell.tsx", "useState(false)", "Mobile navigation starts closed");
assertContains("components/shared/AppShell.tsx", "lg:hidden", "Mobile drawer is separated from desktop navigation");
assertContains("components/shared/GlobalAccessibilityDock.tsx", 'aria-label="Language and read-aloud settings"', "Compact mobile accessibility control exists");
assertContains("components/shared/SpeechProvider.tsx", "naijaclimaguard:auto-read", "Auto-read preference persists");

// Assistant safety and capability.
assertContains("lib/assistant/knowledge.ts", '"flood_definition"', "Assistant can answer a basic flood definition");
assertContains("lib/assistant/knowledge.ts", "I am not sure which part you mean.", "Assistant asks for clarification instead of fabricating intent");
assertContains("lib/assistant/knowledge.ts", "Model v5 is still being validated", "Assistant does not present Model v5 as production");
assertContains("components/assistant/FloodAssistant.tsx", "Official warnings and visible local flooding take priority over chatbot advice.", "Assistant keeps official-warning precedence");

// Withdrawn/unsafe public claims must not return.
const publicCopy = [
  "app/how-to-use/page.tsx",
  "lib/assistant/knowledge.ts",
  "components/dashboard/AdaptiveDashboard.tsx",
  "components/dashboard/MultiSourceIntelligencePanel.tsx",
];
for (const phrase of ["0.9928", "99.28", "48 hours before government", "days ahead from software", "tamper-proof"]) {
  assertAbsent(publicCopy, phrase, `Withdrawn/unsafe public claim absent: ${phrase}`);
}

if (failed) {
  console.error(`\nTRL6 readiness gate failed: ${failed} issue(s).`);
  process.exit(1);
}

console.log("\nTRL6 readiness gate passed. This proves repository operational contracts, not prospective field validation.");
