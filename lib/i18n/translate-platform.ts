import type { AppLocale } from "./config";
import { translatePlatformText as translateCorePlatformText } from "./platform-copy";
import { REPORT_COPY } from "./pages/report";
import { EVIDENCE_OUTLOOK_COPY } from "./pages/evidence-outlook";
import { PROFILE_COMMAND_COPY } from "./pages/profile-command";
import { DASHBOARD_COPY } from "./pages/dashboard";
import { AUTH_COPY } from "./pages/auth";

const PAGE_PACKS = [REPORT_COPY, EVIDENCE_OUTLOOK_COPY, PROFILE_COMMAND_COPY, DASHBOARD_COPY, AUTH_COPY];

export function translatePlatformText(locale: AppLocale, source: string): string {
  if (locale === "en") return source;
  for (const pack of PAGE_PACKS) {
    const translated = pack[locale]?.[source];
    if (translated) return translated;
  }
  return translateCorePlatformText(locale, source);
}
