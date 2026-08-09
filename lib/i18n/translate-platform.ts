import type { AppLocale } from "./config";
import { translatePlatformText as translateCorePlatformText } from "./platform-copy";
import { REPORT_COPY } from "./pages/report";

const PAGE_PACKS = [REPORT_COPY];

export function translatePlatformText(locale: AppLocale, source: string): string {
  if (locale === "en") return source;
  for (const pack of PAGE_PACKS) {
    const translated = pack[locale]?.[source];
    if (translated) return translated;
  }
  return translateCorePlatformText(locale, source);
}
