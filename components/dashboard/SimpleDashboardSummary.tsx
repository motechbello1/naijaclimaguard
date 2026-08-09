"use client";

import Link from "next/link";
import { AlertTriangle, BellRing, CheckCircle2, MapPin, ShieldCheck, Sprout, Store, Landmark } from "lucide-react";
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
  const scored = locations.map((location) => ({ location, risk: risks[location.id] })).filter((item): item is { location: SimpleLocation; risk: SimpleRisk } => typeof item.risk === "object").sort((a, b) => b.risk.score - a.risk.score);
  const highest = scored[0];

  const roleTitle = role === "HOUSEHOLD"
    ? (locale === "pcm" ? "My family safe?" : locale === "ha" ? "Iyalina suna lafiya?" : locale === "yo" ? "Ṣé ìdílé mi wà láàbò?" : locale === "ig" ? "Ezinụlọ m ọ dị nchebe?" : "Is my family safe?")
    : role === "FARMER"
      ? (locale === "pcm" ? "My farm need action?" : locale === "ha" ? "Gonata tana bukatar mataki?" : locale === "yo" ? "Ṣé oko mi nílò ìgbésẹ̀?" : locale === "ig" ? "Ubi m ọ chọrọ action?" : "Does my farm need action?")
      : role === "BUSINESS"
        ? (locale === "pcm" ? "Which site need attention?" : locale === "ha" ? "Wane wuri ne yake bukatar kulawa?" : locale === "yo" ? "Ibi wo ló nílò àkíyèsí?" : locale === "ig" ? "Kedu ebe chọrọ attention?" : "Which site needs attention?")
        : (locale === "pcm" ? "Where we suppose focus first?" : locale === "ha" ? "A ina ya kamata mu fara mayar da hankali?" : locale === "yo" ? "Ibo ni ká kọ́kọ́ dojú kọ?" : locale === "ig" ? "Ebee ka anyị ga-ebido?" : "Where should we focus first?");

  const noLocation = locale === "pcm" ? "Add the first place wey matter to you. We go watch am and tell you wetin to do." : locale === "ha" ? "Ƙara wurin farko da kake damu da shi. Za mu sa ido mu kuma gaya maka abin da za ka yi." : locale === "yo" ? "Fi ibi àkọ́kọ́ tí o ṣe pataki sí ọ kún un. A ó tọ́pa a, a sì sọ ohun tí o yẹ kí o ṣe." : locale === "ig" ? "Tinye ebe mbụ dị gị mkpa. Anyị ga-ele ya anya ma gwa gị ihe ị ga-eme." : "Add the first place you care about. NaijaClimaGuard will watch it and tell you what to do.";

  if (locations.length === 0) return <section className="rounded-3xl border border-radar/20 bg-radar/[0.04] p-6 sm:p-8"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-radar/10"><Icon className="h-6 w-6 text-radar" /></div><div><h2 className="font-display text-2xl font-bold">{roleTitle}</h2><p className="mt-1 text-sm text-slate-500">{noLocation}</p></div></div></section>;

  if (!highest) return <section className="rounded-3xl border border-slate-200 p-6 sm:p-8 dark:border-midnight-border"><div className="flex items-center gap-3"><Icon className="h-6 w-6 text-radar" /><div><h2 className="font-display text-2xl font-bold">{roleTitle}</h2><p className="mt-1 text-sm text-slate-500">{t("loading")}</p></div></div></section>;

  const value = highest.risk.level.toUpperCase();
  const urgent = value.includes("HIGH") || value.includes("CRITICAL") || highest.risk.score >= 60;
  const label = value.includes("CRITICAL") || highest.risk.score >= 80 ? t("actNow") : value.includes("HIGH") || highest.risk.score >= 60 ? t("prepareNow") : value.includes("MODERATE") || highest.risk.score >= 35 ? t("getReady") : t("keepWatching");
  const body = urgent
    ? (locale === "pcm" ? "This place need your attention now. Do the action steps and follow official warning if e dey." : locale === "ha" ? "Wannan wurin yana bukatar kulawarka yanzu. Bi matakan da aka nuna da gargadin hukuma idan akwai." : locale === "yo" ? "Ibi yìí nílò àkíyèsí rẹ báyìí. Ṣe àwọn ìgbésẹ̀ tí a fi hàn, kí o sì tẹ̀lé ìkìlọ̀ ìjọba tí ó bá wà." : locale === "ig" ? "Ebe a chọrọ attention gị ugbu a. Mee action steps ma soro official warning ma ọ dị." : "This place needs your attention now. Follow the action steps and any official warning.")
    : (locale === "pcm" ? "No urgent action show now. Keep alerts on and keep watch." : locale === "ha" ? "Babu matakin gaggawa yanzu. Ci gaba da kunna sanarwa da sa ido." : locale === "yo" ? "Kò sí ìgbésẹ̀ pajawiri báyìí. Jẹ́ kí ìkìlọ̀ ṣiṣẹ́, kí o sì máa ṣọ́ra." : locale === "ig" ? "Enweghị urgent action ugbu a. Mee ka alerts dị on ma nọgide na nche." : "No urgent action is shown right now. Keep alerts on and continue monitoring.");

  return (
    <section className={`rounded-3xl border p-6 sm:p-8 ${urgent ? "border-crimson/25 bg-crimson/[0.04]" : "border-radar/20 bg-radar/[0.04]"}`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${urgent ? "bg-crimson/10" : "bg-radar/10"}`}>{urgent ? <AlertTriangle className="h-6 w-6 text-crimson" /> : <Icon className="h-6 w-6 text-radar" />}</div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{roleTitle}</p><h2 className="font-display text-2xl font-bold sm:text-3xl">{label}</h2></div></div>
          <div className="mt-5 flex items-start gap-2 text-base font-semibold"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" /><span>{highest.location.name}, {highest.location.state}</span></div>
          <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">{body}</p>
        </div>
        <div className="grid min-w-[250px] gap-3">
          <a href={`#location-${highest.location.id}`} className="flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"><span>{t("whatToDoNow")}</span><CheckCircle2 className="h-4 w-4" /></a>
          <Link href="/action" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold dark:border-midnight-border dark:bg-midnight-light"><span>{t("myAlerts")}</span><BellRing className="h-4 w-4 text-radar" /></Link>
        </div>
      </div>
    </section>
  );
}
