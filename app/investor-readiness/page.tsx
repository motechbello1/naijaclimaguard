import Link from "next/link";
import { ArrowRight, BarChart3, Building2, CheckCircle2, CircleDollarSign, Database, Globe2, Landmark, Network, Shield, Target } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

const competitors = [
  {
    name: "NiHSA",
    strength: "National hydrology, Annual Flood Outlook, statutory expertise and nationwide flood-risk products.",
    position: "Treat as an authoritative institution and integration/data partner. NaijaClimaGuard adds action orchestration, user workflows and evidence around authoritative signals.",
  },
  {
    name: "NEMA",
    strength: "National emergency coordination, preparedness, response and the developing Fusion/Trigger Room direction.",
    position: "NaijaClimaGuard can support the signal-to-action workflow, delivery, acknowledgement and after-action evidence without replacing emergency authority.",
  },
  {
    name: "Google Flood Hub",
    strength: "Global AI riverine forecasting, inundation intelligence, basin views and broad geographic scale.",
    position: "Do not compete by pretending global hydrology does not exist. Differentiate through Nigeria-specific action, last-mile delivery, assets, institutions, accountability and local integration.",
  },
];

const nationalSteps = [
  "Build a verified 36-state + FCT historical event registry from institutional sources.",
  "Use nationally consistent historical rainfall, wetness/runoff and terrain/hydrography features.",
  "Freeze event windows, candidates, thresholds and metrics before scoring.",
  "Use temporal and geographic out-of-fold validation, never a random split.",
  "Publish X/Y event detection with the state/jurisdiction denominator, false-alert burden and PR-AUC.",
  "Continue Riverine Watch prospective evidence independently while national retrospective evidence grows.",
];

const valueScenarios = [
  ["0.5%", "$33.4m"],
  ["1%", "$66.8m"],
  ["2%", "$133.6m"],
  ["5%", "$334.0m"],
];

export default function InvestorReadinessPage() {
  return (
    <main className="min-h-screen">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-xl dark:border-midnight-border dark:bg-midnight/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-radar/20 bg-radar/10"><Shield className="h-4 w-4 text-radar" /></div>
            <span className="font-display text-lg font-bold">NaijaClima<span className="text-radar">Guard</span></span>
          </Link>
          <div className="flex items-center gap-3"><ThemeToggle /><Link href="/model-evidence" className="text-sm text-slate-500 hover:text-radar">Evidence</Link><Link href="/institutional-pilot" className="hidden text-sm text-slate-500 hover:text-radar sm:inline">Pilot</Link></div>
        </div>
      </nav>

      <div className="pt-16">
        <section className="border-b border-slate-200 bg-slate-50/60 py-16 dark:border-midnight-border dark:bg-midnight-light/20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-radar/20 bg-radar/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-radar"><Target className="h-3.5 w-3.5" /> Investor & competition readiness</div>
                <h1 className="mt-6 max-w-4xl font-display text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Not another flood map. A Nigerian flood decision network.</h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-500 dark:text-slate-400 sm:text-lg">Forecasts matter, but value is created when the right person receives a trusted signal, understands what is exposed, takes the right action, and the outcome can be measured. NaijaClimaGuard is building that closed-loop layer for households, farmers, businesses and agencies.</p>
                <div className="mt-8 flex flex-wrap gap-3"><Link href="/institutional-pilot" className="inline-flex items-center gap-2 rounded-xl bg-radar px-5 py-3 text-sm font-bold text-white">Run a controlled pilot <ArrowRight className="h-4 w-4" /></Link><Link href="/model-evidence" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold dark:border-midnight-border">Inspect model evidence</Link></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Current riverine result", "80%", "4/5 eligible historical onset events · Lokoja + Makurdi only"],
                  ["Riverine horizon", "14 days", "Frozen WATCH threshold 0.70 · shadow/pilot status"],
                  ["National target", "36 + FCT", "Retrospective benchmark before any national accuracy claim"],
                  ["2022 loss reference", "$6.68bn", "World Bank median estimate of direct economic damage"],
                ].map(([label, value, note]) => <div key={label} className="glass-card rounded-2xl p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 font-display text-3xl font-black text-radar">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{note}</p></div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-widest text-radar">Competitive position</p><h2 className="mt-3 font-display text-3xl font-black sm:text-4xl">Win by owning the layer between prediction and action.</h2><p className="mt-3 text-slate-500 dark:text-slate-400">The strategy is not to make an unsupported claim that every global or national forecasting system is weaker. It is to become the product they can integrate because rebuilding Nigeria-specific decision, delivery and accountability workflows is slower than adopting them.</p></div>
            <div className="mt-8 grid gap-5 lg:grid-cols-3">{competitors.map((item) => <article key={item.name} className="glass-card rounded-2xl p-6"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-radar/10 text-radar">{item.name === "NiHSA" ? <Landmark className="h-5 w-5" /> : item.name === "NEMA" ? <Building2 className="h-5 w-5" /> : <Globe2 className="h-5 w-5" />}</div><h3 className="mt-4 font-display text-xl font-black">{item.name}</h3><p className="mt-3 text-sm leading-6 text-slate-500"><strong>Strength:</strong> {item.strength}</p><p className="mt-3 text-sm leading-6 text-slate-500"><strong>Our position:</strong> {item.position}</p></article>)}</div>
          </div>
        </section>

        <section className="bg-slate-50/70 py-16 dark:bg-midnight-light/20 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="glass-card rounded-2xl p-6 sm:p-8"><div className="flex items-center gap-3"><Database className="h-5 w-5 text-radar" /><h2 className="font-display text-2xl font-black">The national number we build next</h2></div><p className="mt-3 text-sm leading-6 text-slate-500">We do not wait a year and we do not pretend future validation already happened. The temporary substitute is a predeclared national retrospective benchmark. It gives a broader defensible number while prospective Riverine Watch collection keeps running in parallel.</p><div className="mt-5 space-y-3">{nationalSteps.map((step, index) => <div key={step} className="flex gap-3"><span className="font-mono text-xs font-black text-radar">{String(index + 1).padStart(2, "0")}</span><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{step}</p></div>)}</div><div className="mt-6 rounded-xl border border-radar/20 bg-radar/5 p-4 text-sm"><strong>Headline format:</strong> X of Y independently documented eligible flood events detected retrospectively across Z benchmark-ready jurisdictions.</div></div>
              <div className="glass-card rounded-2xl p-6 sm:p-8"><div className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-radar" /><h2 className="font-display text-2xl font-black">What stays scientifically separate</h2></div><div className="mt-5 space-y-4">{[
                ["Riverine Watch v1", "Keep the existing 80% = 4/5 claim bounded to Lokoja + Makurdi and continue daily prospective shadow evidence."],
                ["National retrospective benchmark", "Use historical event replay to measure nationwide discrimination and false-alert burden. Do not call it prospective accuracy."],
                ["Future hydrology upgrade", "Add more operational GloFAS, NiHSA streamflow, local gauges, dam data and verified sensors for local calibration and lead-time proof."],
              ].map(([title, text]) => <div key={title} className="rounded-xl border border-slate-200 p-4 dark:border-midnight-border"><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div>)}</div></div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
              <div><div className="inline-flex items-center gap-2 rounded-full border border-radar/20 bg-radar/5 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-radar"><CircleDollarSign className="h-4 w-4" /> Economic case</div><h2 className="mt-4 font-display text-3xl font-black sm:text-4xl">A tiny improvement can be economically meaningful in a catastrophic flood year.</h2><p className="mt-4 text-sm leading-7 text-slate-500">World Bank reporting places the median estimate of direct economic damage from Nigeria's 2022 floods at about US$6.68 billion. The table is a sensitivity analysis, not a claim that NaijaClimaGuard has already saved this amount.</p><div className="mt-5 rounded-xl border border-amber-300/70 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100"><strong>Investor-safe boundary:</strong> avoided-loss percentages remain assumptions until a real partner pilot links warning, action and outcome data.</div></div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-midnight-border"><div className="grid grid-cols-2 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-500 dark:bg-slate-900/40"><span>Assumed avoidable loss</span><span>Protected value in a 2022-scale event</span></div>{valueScenarios.map(([pct, value]) => <div key={pct} className="grid grid-cols-2 border-t border-slate-200 px-5 py-4 dark:border-midnight-border"><span className="font-bold">{pct}</span><span className="font-display text-xl font-black text-radar">{value}</span></div>)}</div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-slate-950 py-16 text-white dark:border-midnight-border sm:py-20">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6"><Network className="mx-auto h-8 w-8 text-cyan-300" /><h2 className="mt-4 font-display text-3xl font-black sm:text-4xl">The acquisition-grade thesis</h2><p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">The valuable asset is not a single model score. It is a Nigerian network that connects hazard evidence to people, assets, agencies, communication channels and auditable action. That can stand alone, plug into NiHSA/NEMA workflows, consume global models, serve financial institutions, or become an embedded layer inside a larger platform.</p><div className="mt-7 flex justify-center"><Link href="/institutional-pilot" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950">Design the pilot <ArrowRight className="h-4 w-4" /></Link></div></div>
        </section>
      </div>
    </main>
  );
}
