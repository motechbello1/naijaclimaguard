import Link from "next/link";
import {
  ArrowRight, BarChart3, Building2, CheckCircle2, CircleDollarSign, Database,
  FileCheck2, Globe2, Landmark, Languages, Network, RadioTower, Shield,
  Sparkles, Target, Users, Waves,
} from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

const competitorRows = [
  {
    system: "NiHSA",
    strength: "National hydrology, Annual Flood Outlook across 36 states + FCT, public flood dashboard, monitoring stations and statutory expertise.",
    gapWeTarget: "Turn authoritative hydrology into personalised household/farm/business/agency decisions, delivery, acknowledgement, economic exposure and auditable action.",
    icon: Landmark,
  },
  {
    system: "NEMA",
    strength: "National emergency coordination and the Fusion / Trigger Room direction for anticipatory action.",
    gapWeTarget: "Give trigger-room operations a measurable signal → owner → channel → action → receipt → outcome loop without impersonating emergency authority.",
    icon: Building2,
  },
  {
    system: "Google Flood Hub",
    strength: "World-class AI riverine forecasting, inundation intelligence, broad global scale, research datasets and expert/API access.",
    gapWeTarget: "Win the Nigeria-specific operating layer: local roles, five Nigerian language experiences, voice, low-bandwidth action, institutional evidence, exposure and commercial workflows.",
    icon: Globe2,
  },
];

const proofStack = [
  ["Riverine evidence", "80%", "4 of 5 eligible historical onset events detected retrospectively in Lokoja + Makurdi. Not national accuracy."],
  ["Riverine horizon", "14 days", "Frozen WATCH threshold 0.70. Prospective shadow evidence continues independently."],
  ["National evidence scope", "37", "36 states + FCT are now registered in the National Evidence Factory. Only jurisdictions with defensible event evidence enter a score denominator."],
  ["2022 economic reference", "$6.68bn", "World Bank median estimate of direct flood damage. Used as a historical reference, never as claimed NaijaClimaGuard savings."],
];

const actionMoat = [
  { icon: Database, title: "Trust the evidence", text: "Keep official advisories, model signals, source freshness and source failures distinct instead of blending everything into one reassuring score." },
  { icon: Target, title: "Know what is exposed", text: "Connect a hazard to people, homes, farms, stock, roads, facilities and business dependencies with traceable data." },
  { icon: Users, title: "Compile the right action", text: "The same flood does not create the same next step for a household, farmer, business continuity team and emergency agency." },
  { icon: Languages, title: "Reach people as Nigerians", text: "English, Nigerian Pidgin, Hausa, Yoruba and Igbo experiences, with neural voice and low-bandwidth delivery rather than English-only technical dashboards." },
  { icon: RadioTower, title: "Deliver and acknowledge", text: "Email, SMS, WhatsApp and voice channels are evidence-bearing only when a real provider succeeds; acknowledgement is preserved separately." },
  { icon: FileCheck2, title: "Prove what happened", text: "Warning issue time, source state, action, delivery, acknowledgement and verified outcome can become one auditable incident trail." },
];

const sensitivity = [
  ["0.5%", "$33.4m"], ["1%", "$66.8m"], ["2%", "$133.6m"], ["5%", "$334.0m"],
];

export default function InvestorReadinessPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-950 dark:bg-midnight dark:text-white">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#061912]/90 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-lime-300/30 bg-lime-300/10"><Shield className="h-4 w-4 text-lime-300" /></div>
            <span className="font-display text-lg font-black">NaijaClima<span className="text-lime-300">Guard</span></span>
          </Link>
          <div className="flex items-center gap-3"><ThemeToggle /><Link href="/model-evidence" className="text-sm text-white/70 hover:text-lime-300">Evidence</Link><Link href="/institutional-pilot" className="hidden text-sm text-white/70 hover:text-lime-300 sm:inline">Pilot</Link></div>
        </div>
      </nav>

      <section className="relative min-h-[86vh] overflow-hidden bg-[#061912] pt-16 text-white">
        <div className="pointer-events-none absolute -right-24 top-24 h-[32rem] w-[32rem] rounded-full border border-lime-200/10" />
        <div className="pointer-events-none absolute -right-4 top-44 h-[22rem] w-[22rem] rounded-full border border-lime-200/10" />
        <div className="pointer-events-none absolute bottom-[-14rem] left-[-8rem] h-[36rem] w-[36rem] rounded-full bg-cyan-900/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.12fr_.88fr] lg:items-end lg:px-8 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[.2em] text-lime-200"><Sparkles className="h-3.5 w-3.5" /> Investor · Competition · Government proof</div>
            <h1 className="mt-7 max-w-5xl font-display text-5xl font-black leading-[.94] tracking-[-.045em] sm:text-6xl lg:text-7xl">Prediction is useful.<br /><span className="text-lime-300">Action is the product.</span></h1>
            <p className="mt-7 max-w-3xl text-base leading-8 text-white/70 sm:text-lg">NaijaClimaGuard is being built as Nigeria&apos;s flood decision network: hazard evidence comes in, exposure becomes visible, the right person gets a role-specific decision, the warning reaches them in a usable Nigerian language, action is recorded, and the economic outcome can be measured.</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link href="/institutional-pilot" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-lime-300 px-6 text-sm font-black text-[#061912]">Run the proof beside your system <ArrowRight className="h-4 w-4" /></Link><Link href="/model-evidence" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 px-6 text-sm font-bold text-white">Inspect the evidence</Link></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">{proofStack.map(([label,value,note]) => <article key={label} className="rounded-[1.75rem] border border-white/10 bg-white/[.055] p-5 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">{label}</p><p className="mt-3 font-display text-4xl font-black text-lime-300">{value}</p><p className="mt-2 text-xs leading-5 text-white/60">{note}</p></article>)}</div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.82fr_1.18fr] lg:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700 dark:text-lime-300">The standard</p><h2 className="mt-4 max-w-2xl font-display text-4xl font-black tracking-tight sm:text-5xl">We are not building a cheaper copy of what already exists.</h2></div><p className="max-w-3xl text-base leading-8 text-slate-500 dark:text-slate-300">The engineering target is to become measurably better on the complete Nigerian warning-to-action journey. Where another source has stronger raw hydrology, NaijaClimaGuard can ingest it. Where we claim an advantage, a matched benchmark must prove the exact dimension won. That makes the product stronger, not smaller.</p></div>
          <div className="mt-12 overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10">
            {competitorRows.map(({system,strength,gapWeTarget,icon:Icon},index)=><div key={system} className={`grid gap-5 p-6 sm:p-8 lg:grid-cols-[.22fr_.39fr_.39fr] ${index ? "border-t border-slate-200 dark:border-white/10" : ""}`}><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-950 text-lime-300"><Icon className="h-5 w-5" /></div><h3 className="pt-2 font-display text-lg font-black">{system}</h3></div><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">What they already do well</p><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{strength}</p></div><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700 dark:text-lime-300">Where we must win</p><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{gapWeTarget}</p></div></div>)}
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600 dark:bg-white/5 dark:text-slate-300"><strong>Superiority rule:</strong> “better than Google” or “more accurate than NiHSA” is not published as a generic slogan. A named advantage appears only after a same-task, same-event, same-geography matched test wins that dimension. The frozen protocol lives in <code>validation/COMPETITOR_MATCHED_BENCHMARK_PROTOCOL.md</code>.</div>
        </div>
      </section>

      <section className="bg-[#eef2df] py-20 text-[#0b251b] sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl"><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-800">The moat</p><h2 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl">One loop competitors have to assemble from several different systems.</h2></div>
          <div className="mt-12 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">{actionMoat.map(({icon:Icon,title,text},index)=><article key={title} className="border-t border-emerald-950/20 pt-5"><div className="flex items-center justify-between"><Icon className="h-5 w-5" /><span className="font-mono text-xs opacity-40">0{index+1}</span></div><h3 className="mt-6 font-display text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-emerald-950/65">{text}</p></article>)}</div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr]">
            <div><div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/15 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-emerald-800 dark:text-lime-300"><Database className="h-4 w-4" /> National Evidence Factory</div><h2 className="mt-5 font-display text-4xl font-black tracking-tight sm:text-5xl">Get a broader number now without pretending the future already happened.</h2><p className="mt-5 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-300">The national benchmark is executable, not a slide. It registers all 36 states + FCT, builds independent flood-event labels, constructs nationally consistent historical features, and scores state-years out of time while holding the test state out of training. A state with inadequate evidence is an evidence gap, not an invented success.</p><div className="mt-7 space-y-3">{[
              "Automatic flood labels use EC-JRC / GDACS flood-event geometry intersected with Nigeria ADM1 boundaries; curated institutional events remain a second evidence path.",
              "Each test state-year is excluded geographically and temporally from fitting.",
              "Model family and alert threshold are selected from prior data only.",
              "Headline output is event detection with an exact denominator, plus false-alert burden, PR-AUC, ROC-AUC and Brier score.",
              "Prospective Riverine Watch continues separately and can upgrade the operational claim later.",
            ].map(item=><div key={item} className="flex gap-3 text-sm leading-6"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span>{item}</span></div>)}</div></div>
            <aside className="rounded-[2.25rem] bg-[#061912] p-7 text-white sm:p-9"><Waves className="h-7 w-7 text-lime-300" /><p className="mt-8 text-xs font-black uppercase tracking-[.18em] text-white/40">The only acceptable national headline</p><p className="mt-4 font-display text-3xl font-black leading-tight">“X of Y independently documented eligible flood events detected retrospectively across Z scored Nigerian jurisdictions.”</p><p className="mt-5 text-sm leading-7 text-white/60">No hidden denominator. No random train/test split. No “99% accuracy” shortcut. No claim that retrospective replay is prospective warning proof.</p></aside>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-20 dark:border-white/10 dark:bg-white/[.025] sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start"><div><div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/15 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-emerald-800 dark:text-lime-300"><CircleDollarSign className="h-4 w-4" /> Economic decision layer</div><h2 className="mt-5 font-display text-4xl font-black tracking-tight sm:text-5xl">The model number is not the business number.</h2><p className="mt-5 text-sm leading-7 text-slate-500 dark:text-slate-300">The World Bank places direct damage from Nigeria&apos;s 2022 floods at US$3.79bn–US$9.12bn, with a median estimate of US$6.68bn. NaijaClimaGuard is building the exposure → expected loss → intervention → measured avoided loss chain so institutions can decide where action creates the most value.</p><div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100"><strong>Boundary:</strong> the values beside this text are sensitivity scenarios against the historical median damage reference. They are not money already saved by the platform.</div></div><div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[.035]"><div className="grid grid-cols-2 bg-[#061912] px-6 py-4 text-[10px] font-black uppercase tracking-[.15em] text-white/55"><span>Assumed avoidable share</span><span>Value protected in a 2022-scale event</span></div>{sensitivity.map(([pct,value])=><div key={pct} className="grid grid-cols-2 border-t border-slate-200 px-6 py-5 dark:border-white/10"><span className="font-display text-2xl font-black">{pct}</span><span className="font-display text-2xl font-black text-emerald-700 dark:text-lime-300">{value}</span></div>)}</div></div>
        </div>
      </section>

      <section className="bg-[#061912] py-20 text-white sm:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6"><Network className="mx-auto h-9 w-9 text-lime-300" /><p className="mt-7 text-xs font-black uppercase tracking-[.2em] text-white/40">The strategic asset</p><h2 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl">A better Nigerian flood operating system, not a cheaper dashboard.</h2><p className="mx-auto mt-5 max-w-4xl text-base leading-8 text-white/65">The acquisition-grade outcome is a system that repeatedly proves better Nigerian decisions: stronger usable evidence, clearer exposure, faster correct action, better last-mile comprehension, measurable delivery and an auditable economic outcome. Raw forecasting can be ours or ingested from the strongest available source. The network is the product.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/institutional-pilot" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-lime-300 px-6 text-sm font-black text-[#061912]">Benchmark it beside your workflow <ArrowRight className="h-4 w-4" /></Link><Link href="/model-evidence" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 px-6 text-sm font-bold">See current evidence <BarChart3 className="h-4 w-4" /></Link></div></div>
      </section>
    </main>
  );
}
