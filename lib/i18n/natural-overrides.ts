import type { AppLocale } from "./config";

type Dict = Record<string, string>;

const pcm: Dict = {
  "Home & family": "Home & family matter",
  "My Safety": "My Safety Check",
  "Highest saved-location index": "Place wey risk pass",
  "Highest saved-location risk": "Place wey risk pass",
  "Protected assets": "Things we dey protect",
  "Current risk engine": "Risk system we dey use",
  "Alerts": "Warnings",
  "Manage rules →": "Set my warnings →",
  "Manage alerts →": "Set my warnings →",
  "Places I care about": "Places wey matter to me",
  "Your assets — live risk and action": "Things wey you protect — risk and wetin to do",
  "Monitored assets — live risk and action": "Things we dey watch — risk and wetin to do",
  "Add a place": "Add place",
  "Add asset location": "Add place to watch",
  "What to do now": "Wetin to do now",
  "Keep watching": "Keep eye on am",
  "Prepare now": "Prepare now",
  "Act now": "Act now",
  "Asset profile:": "Wetin dey this place:",
  "Actions adapt to asset type, not the score": "Advice fit change based on wetin dey there; flood score no change",
  "Appearance": "How e look",
  "Preferences": "My settings",
  "Working area": "Area wey I dey check",
  "Workspace": "My tools",
  "Explore": "More things",
  "Everything else": "More things you fit do",
  "Your NaijaClimaGuard": "Your NaijaClimaGuard",
  "Home": "Home",
  "My area": "My area",
  "Act": "Wetin to do",
  "More": "More",
  "Sign out": "Comot",
  "Profile": "My account",
  "Economic Impact": "Money & loss impact",
  "Pitch Mode": "Investor pitch",
  "Scenario mode": "Example scenario",
  "Selected working area": "Area wey you choose",
  "Platform access": "Platform access",
  "Available": "E dey available",
  "Awaiting validated inputs": "We still dey wait for correct verified data",
};

const ha: Dict = {
  "Working area": "Yankin da ake dubawa",
  "Workspace": "Kayan aikinka",
  "Explore": "Ƙarin abubuwa",
  "Everything else": "Sauran abubuwa",
  "Appearance": "Bayyanar manhaja",
};

const yo: Dict = {
  "Working area": "Agbègbè tí a ń ṣàyẹ̀wò",
  "Workspace": "Àwọn irinṣẹ́ rẹ",
  "Explore": "Wo síi",
  "Everything else": "Àwọn ohun mìíràn",
  "Appearance": "Ìrísí",
};

const ig: Dict = {
  "Working area": "Mpaghara a na-enyocha",
  "Workspace": "Ngwaọrụ gị",
  "Explore": "Hụkwuo",
  "Everything else": "Ihe ndị ọzọ",
  "Appearance": "Ọdịdị",
};

const OVERRIDES: Record<AppLocale, Dict> = { en: {}, pcm, ha, yo, ig };

export function translateNaturalOverride(locale: AppLocale, source: string): string | null {
  return OVERRIDES[locale]?.[source] || null;
}
