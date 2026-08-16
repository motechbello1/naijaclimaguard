import type { AppLocale } from "./config";
import { translatePlatformText as translateCorePlatformText } from "./platform-copy";
import { translateActionOSExact } from "./action-os";
import { translateActionOSDetailExact } from "./action-os-detail";
import { translateNaturalOverride } from "./natural-overrides";
import { REPORT_COPY } from "./pages/report";
import { EVIDENCE_OUTLOOK_COPY } from "./pages/evidence-outlook";
import { PROFILE_COMMAND_COPY } from "./pages/profile-command";
import { DASHBOARD_COPY } from "./pages/dashboard";
import { AUTH_COPY } from "./pages/auth";
import { TECHNICAL_COPY } from "./pages/technical";
import { NAVIGATION_GROWTH_COPY } from "./pages/navigation-growth";
import { REVENUE_COPY } from "./pages/revenue";

const PAGE_PACKS = [REPORT_COPY, EVIDENCE_OUTLOOK_COPY, PROFILE_COMMAND_COPY, DASHBOARD_COPY, AUTH_COPY, TECHNICAL_COPY, NAVIGATION_GROWTH_COPY, REVENUE_COPY];

const SHELL_COPY: Record<AppLocale, Record<string, string>> = {
  en: {},
  pcm: {
    Home: "Home",
    "My area": "My area",
    Act: "Wetin to do",
    Alerts: "Warnings",
    More: "More",
    Preferences: "My settings",
    Appearance: "How e look",
    "Working area": "Area wey I dey check",
    Workspace: "My tools",
    Explore: "More things",
    "Everything else": "More things you fit do",
    "Your NaijaClimaGuard": "Your NaijaClimaGuard",
    Profile: "My account",
    "Economic Impact": "Money & loss impact",
    "Pitch Mode": "Investor pitch",
    "National platform": "Nigeria-wide platform",
  },
  ha: {
    Home: "Gida",
    "My area": "Yankina",
    Act: "Abin da za a yi",
    Alerts: "Gargadi",
    More: "Ƙari",
    Preferences: "Saitunana",
    Appearance: "Bayyanar manhaja",
    "Working area": "Yankin da ake dubawa",
    Workspace: "Kayan aikinka",
    Explore: "Ƙarin abubuwa",
    "Everything else": "Sauran abubuwa",
    "Your NaijaClimaGuard": "NaijaClimaGuard naka",
    Profile: "Bayanan asusuna",
    "Economic Impact": "Tasirin tattalin arziki",
    "Pitch Mode": "Yanayin gabatarwa",
    "National platform": "Manhajar ƙasa baki ɗaya",
  },
  yo: {
    Home: "Ilé",
    "My area": "Agbègbè mi",
    Act: "Ohun tí mo yẹ kí n ṣe",
    Alerts: "Ìkìlọ̀",
    More: "Síi",
    Preferences: "Àwọn àṣàyàn mi",
    Appearance: "Ìrísí",
    "Working area": "Agbègbè tí a ń ṣàyẹ̀wò",
    Workspace: "Àwọn irinṣẹ́ rẹ",
    Explore: "Wo síi",
    "Everything else": "Àwọn ohun mìíràn",
    "Your NaijaClimaGuard": "NaijaClimaGuard rẹ",
    Profile: "Àkọọlẹ̀ mi",
    "Economic Impact": "Ìpa ọrọ̀-ajé",
    "Pitch Mode": "Ìpo ìfihàn",
    "National platform": "Pẹpẹ gbogbo orílẹ̀-èdè",
  },
  ig: {
    Home: "Ụlọ",
    "My area": "Mpaghara m",
    Act: "Ihe m ga-eme",
    Alerts: "Ọkwa",
    More: "Ihe ọzọ",
    Preferences: "Ntọala m",
    Appearance: "Ọdịdị",
    "Working area": "Mpaghara a na-enyocha",
    Workspace: "Ngwaọrụ gị",
    Explore: "Hụkwuo",
    "Everything else": "Ihe ndị ọzọ",
    "Your NaijaClimaGuard": "NaijaClimaGuard gị",
    Profile: "Akaụntụ m",
    "Economic Impact": "Mmetụta akụ na ụba",
    "Pitch Mode": "Ụdị ngosi",
    "National platform": "Usoro mba niile",
  },
};

function translateDynamic(locale: AppLocale, source: string): string | null {
  const synced = source.match(/^Synced\s+(.+)$/i);
  if (synced) {
    const time = synced[1];
    return locale === "pcm" ? `Last sync ${time}`
      : locale === "ha" ? `An daidaita ${time}`
      : locale === "yo" ? `A mú pọ̀ ${time}`
      : locale === "ig" ? `Emekọrịtara ${time}`
      : source;
  }

  const responded = source.match(/^(\d+) of (\d+) locations responded\. Available locations remain live; retry to recover the rest\.$/i);
  if (responded) {
    const [, available, total] = responded;
    return locale === "pcm" ? `${available} of ${total} locations answer. The ones wey answer still live; retry to recover the rest.`
      : locale === "ha" ? `${available} daga cikin ${total} wurare sun amsa. Wuraren da suka amsa suna aiki; sake gwadawa don dawo da sauran.`
      : locale === "yo" ? `${available} nínú ${total} ibi ló dáhùn. Àwọn tó dáhùn ṣi ń ṣiṣẹ́; tún gbìyànjú láti gba àwọn tó kù.`
      : locale === "ig" ? `${available} n'ime ${total} ebe zara. Ebe ndị zara ka dị live; nwaa ọzọ iji weghachite ndị fọdụrụ.`
      : source;
  }

  const sourceLive = source.match(/^Source:\s*(.+)\s*·\s*Live$/i);
  if (sourceLive) {
    const provider = sourceLive[1];
    return locale === "pcm" ? `Source: ${provider} · Live`
      : locale === "ha" ? `Tushe: ${provider} · Kai tsaye`
      : locale === "yo" ? `Orísun: ${provider} · Lọwọlọwọ`
      : locale === "ig" ? `Isi data: ${provider} · Live`
      : source;
  }

  return null;
}

export function translatePlatformText(locale: AppLocale, source: string): string {
  if (locale === "en") return source;

  const shell = SHELL_COPY[locale]?.[source];
  if (shell) return shell;

  const dynamic = translateDynamic(locale, source);
  if (dynamic) return dynamic;

  const natural = translateNaturalOverride(locale, source);
  if (natural) return natural;

  const actionDetail = translateActionOSDetailExact(source, locale);
  if (actionDetail !== source) return actionDetail;
  const actionCore = translateActionOSExact(source, locale);
  if (actionCore !== source) {
    return actionCore === "Mụọ ihe ị ga-eme tupu ịdọ aka ná ntị bụrụ nkeจริง."
      ? "Mụọ ihe ị ga-eme tupu ịdọ aka ná ntị bụrụ nke n'ezie."
      : actionCore;
  }

  for (const pack of PAGE_PACKS) {
    const translated = pack[locale]?.[source];
    if (translated) return translated;
  }

  return translateCorePlatformText(locale, source);
}
