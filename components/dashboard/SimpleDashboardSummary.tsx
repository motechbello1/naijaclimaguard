"use client";

import Link from "next/link";
import { AlertTriangle, BellRing, CheckCircle2, MapPin, ShieldCheck, Sprout, Store, Landmark, ArrowRight } from "lucide-react";
import type { ExperienceRole } from "@/components/shared/ExperienceProfile";
import { useLanguage } from "@/components/shared/LanguageProvider";

type SimpleRisk = { score: number; level: string; model: string };
type SimpleLocation = { id: string; name: string; state: string };

interface Props {
  role: ExperienceRole;
  locations: SimpleLocation[];
  risks: Record<string, SimpleRisk | "loading" | "error">;
}

const ICONS: Record<ExperienceRole, typeof ShieldCheck> = { HOUSEHOLD: ShieldCheck, FARMER: Sprout, BUSINESS: Store, AGENCY: Landmark };

export default function SimpleDashboardSummary({ role, locations, risks }: Props) {
  const { locale, t } = useLanguage();
  const Icon = ICONS[role];
  const scored = locations
    .map((location) => ({ location, risk: risks[location.id] }))
    .filter((item): item is { location: SimpleLocation; risk: SimpleRisk } => typeof item.risk === "object")
    .sort((a, b) => b.risk.score - a.risk.score);
  const highest = scored[0];

  const roleTitle = role === "HOUSEHOLD"
    ? (locale === "pcm" ? "My family safe?" : locale === "ha" ? "Iyalina suna lafiya?" : locale === "yo" ? "Ṣé ìdílé mi wà láàbò?" : locale === "ig" ? "Ezinụlọ m ọ dị nchebe?" : "Is my family safe?")
    : role === "FARMER"
      ? (locale === "pcm" ? "My farm need action?" : locale === "ha" ? "Gonata tana bukatar mataki?" : locale === "yo" ? "Ṣé oko mi nílò ìgbésẹ̀?" : locale === "ig" ? "Ubi m ọ chọrọ action?" : "Does my farm need action?")
      : role === "BUSINESS"
        ? (locale === "pcm" ? "Which site need attention?" : locale === "ha" ? "Wane wuri ne yake bukatar kulawa?" : locale === "yo" ? "Ibi wo ló nílò àkíyèsí?" : locale === "ig" ? "Kedu ebe chọrọ attention?" : "Which site needs attention?")
        : (locale === "pcm" ? "Where we suppose focus first?" : locale === "ha" ? "A ina ya kamata mu fara mayar da hankali?" : locale === "yo" ? "Ibo ni ká kọ́kọ́ dojú kọ?" : locale === "ig" ? "Ebee ka anyị ga-ebido?" : "Where should we focus first?");

  const noLocation = locale === "pcm"
    ? "Add the first place wey matter to you. We go watch am and tell you wetin to do."
    : locale === "ha"
      ? "Ƙara wurin farko da kake damu da shi. Za mu sa ido mu kuma gaya maka abin da za ka yi."
      : locale === "yo"
        ? "Fi ibi àkọ́kọ́ tí o ṣe pataki sí ọ kún un. A ó tọ́pa a, a sì sọ ohun tí o yẹ kí o ṣe."
        : locale === "ig"
          ? "Tinye ebe mbụ dị gị mkpa. Anyị ga-ele ya anya ma gwa gị ihe ị ga-eme."
          : "Add the first place you care about. NaijaClimaGuard will watch it and tell you what to do.";

  if (locations.length === 0) {
    return (
      <section className="ncg-water-panel rounded-[2.25rem] px-6 py-8 sm:px-8" data-read-aloud>
        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#071713] text-[#d9ff57]"><Icon className="h-6 w-6" /></div>
          <p className="text-[11px] font-black uppercase tracking-[.22em] text-emerald-700 dark:text-[#d9ff57]">{roleTitle}</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-black leading-tight sm:text-4xl">{noLocation}</h2>
        </div>
      </section>
    );
  }

  if (!highest) {
    return (
      <section className="ncg-water-panel rounded-[2.25rem] px-6 py-8 sm:px-8" data-read-aloud>
        <div className="relative z-10 flex items-center gap-4"><Icon className="h-6 w-6 text-radar" /><div><p className="text-[11px] font-black uppercase tracking-[.22em] text-emerald-700 dark:text-[#d9ff57]">{roleTitle}</p><h2 className="mt-2 text-2xl font-black">{t("loading")}</h2></div></div>
      </section>
    );
  }

  const value = highest.risk.level.toUpperCase();
  const urgent = value.includes("HIGH") || value.includes("CRITICAL") || highest.risk.score >= 60;
  const moderate = value.includes("MODERATE") || highest.risk.score >= 35;
  const label = value.includes("CRITICAL") || highest.risk.score >= 80 ? t("actNow") : value.includes("HIGH") || highest.risk.score >= 60 ? t("prepareNow") : moderate ? t("getReady") : t("keepWatching");
  const body = urgent
    ? (locale === "pcm" ? "This place need your attention now. Open am, do the action steps and follow official warning if e dey." : locale === "ha" ? "Wannan wurin yana bukatar kulawarka yanzu. Buɗe shi, bi matakan da aka nuna da gargadin hukuma idan akwai." : locale === "yo" ? "Ibi yìí nílò àkíyèsí rẹ báyìí. Ṣí i, ṣe àwọn ìgbésẹ̀ tí a fi hàn, kí o sì tẹ̀lé ìkìlọ̀ ìjọba tí ó bá wà." : locale === "ig" ? "Ebe a chọrọ attention gị ugbu a. Mepee ya, mee action steps ma soro official warning ma ọ dị." : "This place needs your attention now. Open it, follow the action steps and any official warning.")
    : moderate
      ? (locale === "pcm" ? "No panic. But make you ready and keep eye on this place." : locale === "ha" ? "Ba bu bukatar firgita. Amma ka shirya kuma ka ci gaba da sa ido." : locale === "yo" ? "Má bẹ̀rù. Ṣùgbọ́n múra sílẹ̀, kí o sì máa ṣọ́ra." : locale === "ig" ? "Atụla ụjọ. Kwado ma nọgide na-ele ebe a." : "No need to panic. Get ready and keep watching this place.")
      : (locale === "pcm" ? "No urgent action show now. Keep alerts on and keep watch." : locale === "ha" ? "Babu matakin gaggawa yanzu. Ci gaba da kunna sanarwa da sa ido." : locale === "yo" ? "Kò sí ìgbésẹ̀ pajawiri báyìí. Jẹ́ kí ìkìlọ̀ ṣiṣẹ́, kí o sì máa ṣọ́ra." : locale === "ig" ? "Enweghị urgent action ugbu a. Mee ka alerts dị on ma nọgide na nche." : "No urgent action is shown right now. Keep alerts on and continue monitoring.");

  return (
    <section className={`relative overflow-hidden rounded-[2.5rem] px-6 py-7 sm:px-9 sm:py-9 ${urgent ? "bg-[#20120d] text-white" : "bg-[#071713] text-white"}`} data-read-aloud>
      <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/5" />
      <div className="relative z-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${urgent ? "bg-[#ffcb6b]/14 text-[#ffcb6b]" : "bg-[#d9ff57]/12 text-[#d9ff57]"}`}>{urgent ? <AlertTriangle className="h-6 w-6" /> : <Icon className="h-6 w-6" />}</div>
            <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-white/45">{roleTitle}</p><h2 className="mt-1 font-display text-3xl font-black tracking-[-.04em] sm:text-4xl">{label}</h2></div>
          </div>
          <div className="mt-7 flex items-start gap-2 text-base font-bold"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#d9ff57]" /><span>{highest.location.name}, {highest.location.state}</span></div>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/65">{body}</p>
        </div>
        <div className="grid min-w-[230px] gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <a href={`#location-${highest.location.id}`} className="flex items-center justify-between rounded-full bg-[#d9ff57] px-5 py-3.5 text-sm font-black text-[#071713]"><span>{t("whatToDoNow")}</span><ArrowRight className="h-4 w-4" /></a>
          <Link href="/action" className="flex items-center justify-between rounded-full border border-white/15 px-5 py-3.5 text-sm font-bold text-white"><span>{t("myAlerts")}</span><BellRing className="h-4 w-4 text-[#d9ff57]" /></Link>
        </div>
      </div>
    </section>
  );
}
