import type { AppLocale } from "./config";
import { translatePlatformText as translateCorePlatformText } from "./platform-copy";
import { translateActionOSExact } from "./action-os";
import { translateActionOSDetailExact } from "./action-os-detail";
import { REPORT_COPY } from "./pages/report";
import { EVIDENCE_OUTLOOK_COPY } from "./pages/evidence-outlook";
import { PROFILE_COMMAND_COPY } from "./pages/profile-command";
import { DASHBOARD_COPY } from "./pages/dashboard";
import { AUTH_COPY } from "./pages/auth";
import { TECHNICAL_COPY } from "./pages/technical";

const PAGE_PACKS = [
  REPORT_COPY,
  EVIDENCE_OUTLOOK_COPY,
  PROFILE_COMMAND_COPY,
  DASHBOARD_COPY,
  AUTH_COPY,
  TECHNICAL_COPY,
];

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

  const dynamic = translateDynamic(locale, source);
  if (dynamic) return dynamic;

  // Action OS used to run a second MutationObserver. It now shares this one pipeline.
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
