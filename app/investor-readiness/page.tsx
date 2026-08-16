"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight, BadgeCheck, Banknote, Building2, Check, CircleDollarSign,
  Database, FileCheck2, Heart, Landmark, Languages, Network, Play,
  RadioTower, ShieldCheck, Sprout, Target,
} from "lucide-react";
import PublicExperienceNav from "@/components/shared/PublicExperienceNav";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { PRODUCT_PROOF_COPY, type ProofRole } from "@/lib/i18n/product-proof";
import economicBaseline from "@/data/economic/national_economic_baseline_v1.json";
import trl6Register from "@/validation/TRL6_EVIDENCE_REGISTER.json";
import type { AppLocale } from "@/lib/i18n/config";

const HERO_IMAGE = "https://images.unsplash.com/photo-1741110539426-fce3268c3c0d?auto=format&fit=crop&fm=jpg&q=82&w=2400";
const ROLE_ICONS = { household: Heart, farm: Sprout, business: Building2, agency: Landmark };
const FLOW_ICONS = [RadioTower, Target, ShieldCheck, Languages, BadgeCheck];
const MOAT_ICONS = [Database, Network, Target, FileCheck2];
const FUNDING_AMOUNTS = ["£60,000", "£22,500", "£22,500", "£30,000", "£7,500", "£7,500"];

const TRL6_COPY: Record<AppLocale, { eyebrow: string; title: string; body: string; verified: string; progress: string; required: string; rule: string; gates: string[] }> = {
  en: { eyebrow: "TRL 6 readiness room", title: "Ready to demonstrate. Not allowed to bluff.", body: "The software package is integrated for a relevant-environment demonstration. The evidence register keeps the achievement claim locked until every field gate has a reviewable reference.", verified: "Verified", progress: "In progress", required: "Field evidence", rule: "TRL 6 is achieved only after the relevant-environment demonstration and independent review are signed.", gates: ["Integrated software", "Relevant-environment pilot", "Representative users", "Prospective shadow evidence", "Authorised source", "Last-mile delivery", "Language safety review", "Action and outcome ledger", "Failure and safety drill", "Independent review"] },
  pcm: { eyebrow: "TRL 6 readiness room", title: "Ready to demonstrate. We no dey bluff.", body: "The full software don join for relevant-environment demonstration. Evidence register go lock the achieved claim until every field gate get proof wey person fit review.", verified: "Verified", progress: "E dey run", required: "Field evidence", rule: "TRL 6 achieved only after signed relevant-environment demonstration and independent review.", gates: ["Complete software", "Relevant-environment pilot", "Real users", "Prospective shadow evidence", "Authorised source", "Last-mile delivery", "Language safety review", "Action and outcome ledger", "Failure and safety drill", "Independent review"] },
  ha: { eyebrow: "Dakin shirin TRL 6", title: "A shirye don gwaji. Ba a yarda da ƙarya ba.", body: "An haɗa cikakken software domin gwaji a yanayin da ya dace. Rajistar shaida tana kulle ikirarin nasara har sai kowace ƙofar fili tana da shaida da za a duba.", verified: "An tabbatar", progress: "Ana aiki", required: "Shaidar fili", rule: "Ana cimma TRL 6 ne bayan gwajin yanayi mai dacewa da bita mai zaman kanta sun samu sa hannu.", gates: ["Cikakken software", "Gwajin yanayi mai dacewa", "Masu amfani na gaske", "Shaidar prospective shadow", "Tushen da aka ba izini", "Isarwa ta ƙarshe", "Binciken tsaron harshe", "Littafin aiki da sakamako", "Gwajin gazawa da tsaro", "Bita mai zaman kanta"] },
  yo: { eyebrow: "Yàrá ìmúrasílẹ̀ TRL 6", title: "Ó ṣetan fún àfihàn. Kò sí àyè fún èké.", body: "A ti so gbogbo software pọ̀ fún àfihàn ní relevant environment. Evidence register pa claim mọ́ títí gbogbo field gate fi ní ẹ̀rí tí a lè ṣàyẹ̀wò.", verified: "A ti fìdí rẹ̀ múlẹ̀", progress: "Ó ń lọ", required: "Ẹ̀rí pápá", rule: "A ṣe àṣeyọrí TRL 6 lẹ́yìn relevant-environment demonstration àti independent review tí a fọwọ́ sí.", gates: ["Software tí a so pọ̀", "Relevant-environment pilot", "Àwọn olùlò gidi", "Prospective shadow evidence", "Authorised source", "Last-mile delivery", "Language safety review", "Action and outcome ledger", "Failure and safety drill", "Independent review"] },
  ig: { eyebrow: "TRL 6 readiness room", title: "Ọ dị njikere maka ngosi. Enweghị bluff.", body: "E jikọtara software niile maka relevant-environment demonstration. Evidence register na-akpọchi achieved claim ruo mgbe field gate niile nwere proof a pụrụ inyocha.", verified: "Verified", progress: "Ọ na-aga", required: "Field evidence", rule: "TRL 6 achieved naanị mgbe relevant-environment demonstration na independent review bịanyere aka.", gates: ["Integrated software", "Relevant-environment pilot", "Representative users", "Prospective shadow evidence", "Authorised source", "Last-mile delivery", "Language safety review", "Action and outcome ledger", "Failure and safety drill", "Independent review"] },
};

const formatUsdMillions = (value: number) => `$${(value / 1_000_000).toFixed(1)}m`;

export default function InvestorReadinessPage() {
  const { locale } = useLanguage();
  const copy = PRODUCT_PROOF_COPY[locale].investor;
  const trl6 = TRL6_COPY[locale];
  const [role, setRole] = useState<ProofRole>("household");
  const scenario = copy.scenarios[role];
  const flow = [copy.signalDetail, scenario.exposure, scenario.decision, scenario.delivery, scenario.proof];
  const sensitivity = economicBaseline.avoided_loss_sensitivity.map((item) => ({ label: `${item.avoidable_loss_percent}%`, value: formatUsdMillions(item.protected_value_usd_at_2022_median_damage) }));

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#0d1f19] dark:bg-[#07110e] dark:text-white">
      <PublicExperienceNav />

      <section className="relative min-h-[92vh] overflow-hidden bg-[#071713] pt-16 text-white">
        <div className="absolute inset-0" aria-hidden="true" style={{ backgroundImage: `url(${HERO_IMAGE})`, backgroundPosition: "center", backgroundSize: "cover" }} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,18,14,.98)_0%,rgba(4,18,14,.86)_48%,rgba(4,18,14,.28)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#071713_0%,transparent_55%)]" />
        <div className="relative mx-auto grid min-h-[calc(92vh-4rem)] max-w-7xl items-end gap-10 px-4 pb-14 pt-20 sm:px-6 sm:pb-20 lg:grid-cols-[1.15fr_.85fr] lg:px-8">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#d9ff57]">{copy.eyebrow}</p>
            <h1 className="mt-6 max-w-4xl font-display text-5xl font-black leading-[.92] tracking-[-.055em] sm:text-7xl lg:text-[6.6rem]">{copy.title}</h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">{copy.lead}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/my-area" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#d9ff57] px-6 text-sm font-black text-[#071713]">{copy.openProduct}<ArrowRight className="h-4 w-4" /></Link>
              <Link href="/pitch" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-black/20 px-6 text-sm font-black backdrop-blur"><Play className="h-4 w-4 fill-current" />Pitch from the product</Link>
            </div>
          </div>
          <aside className="border border-white/15 bg-[#071713]/78 p-6 backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between gap-4 border-b border-white/12 pb-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#d9ff57]">{copy.readinessLabel}</p><span className="rounded-full bg-[#d9ff57] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#071713]">DEMO READY</span></div>
            <h2 className="mt-6 font-display text-3xl font-black leading-tight">{copy.readinessTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-white/62">{copy.readinessBody}</p>
            <div className="mt-7 grid grid-cols-3 border-y border-white/12 py-5">{[["37","states + FCT"],["4 / 5","frozen events"],["LIVE","product"]].map(([value,label], index) => <div key={label} className={index ? "border-l border-white/12 px-3" : "pr-3"}><p className="font-display text-2xl font-black text-[#d9ff57]">{value}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-white/42">{label}</p></div>)}</div>
          </aside>
        </div>
        <div className="absolute bottom-4 right-5 text-[10px] text-white/42">Flood photograph: Iqro Rinaldi / Unsplash</div>
      </section>

      <section className="border-b border-black/8 py-20 dark:border-white/10 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700 dark:text-[#d9ff57]">{copy.demoEyebrow}</p><h2 className="mt-5 font-display text-4xl font-black leading-[1.02] sm:text-6xl">{copy.demoTitle}</h2></div><div><p className="max-w-3xl text-base leading-8 text-slate-600 dark:text-white/62">{copy.demoBody}</p><p className="mt-4 border-l-2 border-amber-500 pl-4 text-xs leading-5 text-slate-500 dark:text-white/45">{copy.demoNotice}</p></div></div>
          <div className="mt-12 flex flex-wrap gap-2" role="group" aria-label={copy.roleLabel}>{(Object.keys(copy.roles) as ProofRole[]).map((item) => { const Icon=ROLE_ICONS[item]; return <button key={item} type="button" onClick={() => setRole(item)} aria-pressed={role === item} className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-black transition ${role === item ? "bg-[#071713] text-white dark:bg-[#d9ff57] dark:text-[#071713]" : "border border-black/12 bg-white text-slate-600 dark:border-white/15 dark:bg-white/4 dark:text-white/65"}`}><Icon className="h-4 w-4" />{copy.roles[item]}</button>; })}</div>
          <div className="mt-8 grid border-y border-black/12 dark:border-white/12 lg:grid-cols-5">{flow.map((text,index) => { const Icon=FLOW_ICONS[index]; const label=Object.values(copy.fields)[index]; return <article key={label} className={`relative min-h-64 py-7 lg:px-6 ${index ? "border-t border-black/10 dark:border-white/10 lg:border-l lg:border-t-0" : "lg:pr-6"}`}><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-emerald-700 dark:text-[#d9ff57]" /><span className="font-mono text-xs text-slate-400">0{index+1}</span></div><h3 className="mt-12 text-xs font-black uppercase tracking-[.16em] text-slate-400">{label}</h3><p className="mt-4 text-sm font-bold leading-7">{text}</p></article>; })}</div>
        </div>
      </section>

      <section className="bg-[#d9ff57] py-20 text-[#071713] sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[.2em]">{copy.moatEyebrow}</p>
          <div className="mt-5 grid gap-10 lg:grid-cols-[.82fr_1.18fr]"><div><h2 className="font-display text-4xl font-black leading-[1.02] sm:text-6xl">{copy.moatTitle}</h2><p className="mt-6 max-w-xl text-base leading-8 text-[#163129]/72">{copy.moatBody}</p></div><div className="grid border-t-2 border-[#071713] sm:grid-cols-2">{copy.moatItems.map((item,index) => { const Icon=MOAT_ICONS[index]; return <article key={item.title} className={`py-7 ${index%2 ? "sm:border-l sm:border-[#071713]/20 sm:pl-7" : "sm:pr-7"} ${index>1 ? "border-t border-[#071713]/20" : index ? "border-t border-[#071713]/20 sm:border-t-0" : ""}`}><Icon className="h-6 w-6" /><h3 className="mt-8 font-display text-2xl font-black">{item.title}</h3><p className="mt-3 text-sm leading-6 text-[#163129]/68">{item.body}</p></article>; })}</div></div>
          <div className="mt-14 grid overflow-hidden border border-[#071713]/25 lg:grid-cols-2"><div className="p-7"><p className="text-xs font-black uppercase tracking-[.16em] text-[#163129]/55">{copy.forecastQuestion}</p><p className="mt-4 font-display text-3xl font-black text-[#163129]/70">{copy.forecastAnswer}</p></div><div className="border-t border-[#071713]/25 bg-[#071713] p-7 text-white lg:border-l lg:border-t-0"><p className="text-xs font-black uppercase tracking-[.16em] text-[#d9ff57]">{copy.networkQuestion}</p><p className="mt-4 font-display text-3xl font-black">{copy.networkAnswer}</p></div></div>
        </div>
      </section>

      <section className="bg-[#071713] py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#d9ff57]">{trl6.eyebrow}</p><h2 className="mt-5 font-display text-4xl font-black leading-[1.02] sm:text-6xl">{trl6.title}</h2><p className="mt-6 text-base leading-8 text-white/60">{trl6.body}</p></div><div className="border-y border-white/15">{trl6Register.gates.map((gate,index) => { const translatedStatus=gate.status === "VERIFIED" ? trl6.verified : gate.status === "IN_PROGRESS" ? trl6.progress : trl6.required; return <div key={gate.id} className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 ${index ? "border-t border-white/10" : ""}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full ${gate.status === "VERIFIED" ? "bg-[#d9ff57] text-[#071713]" : "border border-white/20 text-white/45"}`}>{gate.status === "VERIFIED" ? <Check className="h-4 w-4" /> : <span className="text-[10px] font-black">{String(index+1).padStart(2,"0")}</span>}</span><p className="text-sm font-bold">{trl6.gates[index]}</p><span className={`text-[10px] font-black uppercase tracking-wider ${gate.status === "VERIFIED" ? "text-[#d9ff57]" : gate.status === "IN_PROGRESS" ? "text-cyan-300" : "text-white/38"}`}>{translatedStatus}</span></div>; })}</div></div>
          <p className="mt-10 border-l-4 border-[#d9ff57] pl-5 text-sm font-bold leading-7 text-white/72">{trl6.rule}</p>
        </div>
      </section>

      <section className="border-b border-black/8 py-20 dark:border-white/10 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <article><CircleDollarSign className="h-7 w-7 text-emerald-700 dark:text-[#d9ff57]" /><h2 className="mt-7 font-display text-4xl font-black leading-tight">{copy.economicsTitle}</h2><p className="mt-5 text-sm leading-7 text-slate-600 dark:text-white/58">{copy.economicsBody}</p><div className="mt-8 border-y border-black/12 dark:border-white/12"><div className="grid grid-cols-[1fr_auto] gap-4 py-5"><span className="text-sm text-slate-500">{copy.damageReference}</span><strong className="font-display text-3xl">$6.68bn</strong></div><div className="grid grid-cols-[1fr_auto] gap-4 border-t border-black/10 py-5 dark:border-white/10"><span className="text-sm text-slate-500">{copy.populationReference}</span><strong className="font-display text-3xl">237.5m</strong></div></div><p className="mt-7 text-xs font-black uppercase tracking-[.16em] text-slate-400">{copy.sensitivity}</p><div className="mt-4 grid grid-cols-4 border border-black/12 dark:border-white/12">{sensitivity.map((item,index) => <div key={item.label} className={`p-3 text-center sm:p-4 ${index ? "border-l border-black/10 dark:border-white/10" : ""}`}><p className="text-xs font-bold text-slate-400">{item.label}</p><p className="mt-2 font-display text-base font-black sm:text-xl">{item.value}</p></div>)}</div><p className="mt-3 text-xs leading-5 text-slate-500">{copy.sensitivityNote}</p></article>
          <article><Banknote className="h-7 w-7 text-emerald-700 dark:text-[#d9ff57]" /><h2 className="mt-7 font-display text-4xl font-black leading-tight">{copy.fundingTitle}</h2><p className="mt-5 text-sm leading-7 text-slate-600 dark:text-white/58">{copy.fundingBody}</p><div className="mt-8 border-y border-black/12 dark:border-white/12">{copy.fundingLabels.map((label,index) => <div key={label} className={`grid grid-cols-[1fr_auto] gap-4 py-3.5 text-sm ${index ? "border-t border-black/8 dark:border-white/8" : ""}`}><span className="font-bold">{label}</span><span className="font-mono font-black text-emerald-700 dark:text-[#d9ff57]">{FUNDING_AMOUNTS[index]}</span></div>)}<div className="grid grid-cols-[1fr_auto] border-t-2 border-[#071713] py-5 dark:border-white"><span className="font-black">TOTAL</span><span className="font-mono text-xl font-black">£150,000</span></div></div></article>
        </div>
      </section>

      <section className="py-20 sm:py-28"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]"><div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700 dark:text-[#d9ff57]">{copy.boundaryTitle}</p><h2 className="mt-5 font-display text-4xl font-black leading-tight sm:text-5xl">{copy.comparisonTitle}</h2><p className="mt-5 text-sm leading-7 text-slate-600 dark:text-white/58">{copy.comparisonBody}</p></div><div className="grid border-y border-black/12 dark:border-white/12 sm:grid-cols-2"><article className="py-7 sm:pr-7"><h3 className="font-display text-2xl font-black">{copy.claimedNow}</h3><ul className="mt-6 space-y-4">{copy.claimedList.map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/62"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700 dark:text-[#d9ff57]" />{item}</li>)}</ul></article><article className="border-t border-black/10 py-7 dark:border-white/10 sm:border-l sm:border-t-0 sm:pl-7"><h3 className="font-display text-2xl font-black">{copy.notClaimed}</h3><ul className="mt-6 space-y-4">{copy.blockedList.map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/62"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />{item}</li>)}</ul></article></div></div></div></section>

      <section className="bg-[#d9ff57] py-16 text-[#071713]"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 sm:px-6 lg:flex-row lg:items-end lg:px-8"><div><p className="text-xs font-black uppercase tracking-[.2em]">Founder story and live product</p><h2 className="mt-4 max-w-3xl font-display text-4xl font-black leading-tight sm:text-6xl">The pitch film stays inside the product experience.</h2></div><div className="flex flex-col gap-3 sm:flex-row"><Link href="/pitch" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#071713] px-6 text-sm font-black text-white"><Play className="h-4 w-4 fill-current" />Open pitch mode</Link><Link href="/model-evidence" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#071713]/30 px-6 text-sm font-black">{copy.inspectEvidence}<ArrowRight className="h-4 w-4" /></Link></div></div></section>
    </main>
  );
}
