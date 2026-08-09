import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [
  {
    file: "lib/i18n/config.ts",
    rules: [
      ['AppLocale includes first-wave languages', '"en" | "pcm" | "ha" | "yo" | "ig"'],
      ['Pidgin appears in platform selector', 'Nigerian Pidgin'],
      ['Hausa appears in platform selector', 'nativeLabel: "Hausa"'],
      ['Yoruba appears in platform selector', 'nativeLabel: "Yorùbá"'],
      ['Igbo appears in platform selector', 'nativeLabel: "Igbo"'],
    ],
  },
  {
    file: "prisma/schema.prisma",
    rules: [
      ['Platform language is persisted independently', 'platformLanguage  String'],
      ['Alert language remains separately persisted', 'preferredLanguage String'],
    ],
  },
  {
    file: "lib/i18n/translate-platform.ts",
    rules: [
      ['Technical phrase pack is wired globally', 'TECHNICAL_COPY'],
      ['Dynamic live-text translation exists', 'translateDynamic'],
      ['Synced status is handled dynamically', 'source.match(/^Synced'],
    ],
  },
  {
    file: "components/shared/AppShell.tsx",
    rules: [
      ['Mobile drawer is closed by default', 'const [mobileOpen, setMobileOpen] = useState(false)'],
      ['Desktop sidebar is desktop-only', 'hidden lg:flex flex-col'],
      ['Mobile drawer is hidden on desktop', 'fixed inset-0 z-[120] lg:hidden'],
      ['Navigation closes after route change', 'setMobileOpen(false);'],
      ['Mobile utility controls are hidden from header', 'ml-auto hidden items-center gap-2 lg:flex'],
      ['Mobile menu icon is compact', '<Menu className="h-4 w-4" />'],
      ['Mobile logo receives compact sizing', '<Logo mobile />'],
    ],
  },
  {
    file: "components/shared/GlobalAccessibilityDock.tsx",
    rules: [
      ['Public mobile accessibility is one compact button', 'aria-label="Language and read-aloud settings"'],
      ['Mobile accessibility button is phone-only', 'sm:hidden'],
      ['Accessibility controls open in a mobile dialog', 'aria-label="Language and accessibility"'],
    ],
  },
  {
    file: "components/shared/SpeechProvider.tsx",
    rules: [
      ['Auto-read preference is persisted', 'naijaclimaguard:auto-read'],
      ['Hausa speech locale is configured', 'ha: "ha-NG"'],
      ['Yoruba speech locale is configured', 'yo: "yo-NG"'],
      ['Igbo speech locale is configured', 'ig: "ig-NG"'],
      ['Page navigation can trigger auto-read', '[pathname, locale, autoRead, supported]'],
    ],
  },
  {
    file: "vercel.json",
    rules: [
      ['Model v5 preview builds are disabled', '"model-v5-*": false'],
      ['Product preview builds are disabled', '"product-*": false'],
      ['Ops preview builds are disabled', '"ops-*": false'],
    ],
  },
];

let failed = 0;
for (const group of checks) {
  const source = read(group.file);
  for (const [label, needle] of group.rules) {
    if (!source.includes(needle)) {
      failed += 1;
      console.error(`FAIL: ${label} (${group.file})`);
    } else {
      console.log(`PASS: ${label}`);
    }
  }
}

if (failed) {
  console.error(`\nPlatform experience QA failed: ${failed} regression(s).`);
  process.exit(1);
}

console.log("\nPlatform experience QA passed.");
