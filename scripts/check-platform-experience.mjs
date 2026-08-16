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
      ['Mobile drawer is closed by default', 'const [moreOpen, setMoreOpen] = useState(false)'],
      ['Desktop sidebar is desktop-only', 'lg:flex lg:flex-col'],
      ['Mobile drawer is hidden on desktop', 'fixed inset-0 z-[90] lg:hidden'],
      ['Navigation closes after route change', 'useEffect(() => setMoreOpen(false), [pathname])'],
      ['Desktop utility controls stay out of the compact header', 'hidden xl:block'],
      ['Mobile menu icon is compact', '<Menu className="h-[18px] w-[18px]" />'],
      ['Mobile brand icon receives compact sizing', '<Waves className="h-4 w-4" />'],
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
    file: "lib/assistant/knowledge.ts",
    rules: [
      ['Assistant has a flood-definition intent', '"flood_definition"'],
      ['What-is-flood routes to flood education', 'what is (a )?flood'],
      ['Assistant has causes knowledge', 'causes:'],
      ['Assistant has during-flood guidance', 'during:'],
      ['Assistant fallback asks for clarification', 'I am not sure which part you mean.'],
      ['Assistant distinguishes Model v5 from public engine', 'Model v5 is still being validated'],
    ],
  },
  {
    file: "components/assistant/FloodAssistant.tsx",
    rules: [
      ['Mobile assistant uses the full dynamic viewport', 'h-[100dvh]'],
      ['Assistant auto-scrolls to the latest response', 'bottomRef.current?.scrollIntoView'],
      ['Assistant supports contextual follow-up suggestions', 'message.suggestions'],
      ['Safety precedence appears once as a compact chat banner', 'Official warnings and visible local flooding take priority over chatbot advice.'],
    ],
  },
  {
    file: "app/how-to-use/page.tsx",
    rules: [
      ['Withdrawn 0.9928 claim is absent', 'The public live score is currently the disclosed derived-v2'],
      ['How-to-use distinguishes GloFAS modelled discharge', 'GloFAS is modelled discharge'],
      ['How-to-use keeps official warnings above low scores', 'Never use a low NaijaClimaGuard score'],
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

const withdrawn = ["0.9928", "99.28", "48 hours before government", "2022 Nigerian megaflood"];
const publicCopy = [
  "app/how-to-use/page.tsx",
  "lib/assistant/knowledge.ts",
].map((file) => `${file}\n${read(file)}`).join("\n").toLowerCase();
for (const phrase of withdrawn) {
  if (publicCopy.includes(phrase.toLowerCase())) {
    failed += 1;
    console.error(`FAIL: withdrawn public claim remains: ${phrase}`);
  } else {
    console.log(`PASS: withdrawn public claim absent: ${phrase}`);
  }
}

if (failed) {
  console.error(`\nPlatform experience QA failed: ${failed} regression(s).`);
  process.exit(1);
}

console.log("\nPlatform experience QA passed.");
