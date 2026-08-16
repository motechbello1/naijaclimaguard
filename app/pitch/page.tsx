import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft, ArrowRight, BarChart3, Building2, CheckCircle2, CircleDollarSign,
  Clock3, Database, FlaskConical, Globe2, Landmark, Network,
  Play, Radio, Route, Shield, Sprout, Target, Users, WalletCards, Waves,
} from "lucide-react";

const openingSections = [
  { n: "01", title: "The flood is not the only problem.", body: "Nigeria can have forecasts, reports and warnings and still lose lives, farms, roads and businesses because the final mile from intelligence to action is fragmented." },
  { n: "02", title: "The missing layer is the decision system.", body: "NaijaClimaGuard connects hazard evidence → exposed people and assets → the right owner → a usable action → last-mile delivery → acknowledgement → verified outcome." },
  { n: "03", title: "One platform, different human questions.", body: "A household asks whether home is safe. A farmer asks what to move. Government asks where to act first. An insurer asks what portfolio is exposed. The same evidence becomes a role-specific decision." },
];

const capabilities: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Waves, label: "Public risk engine" },
  { icon: BarChart3, label: "Riverine Watch v1" },
  { icon: Shield, label: "Action OS" },
  { icon: Database, label: "Evidence ledger" },
  { icon: Users, label: "Citizen workflows" },
  { icon: Globe2, label: "API layer" },
  { icon: Landmark, label: "Agency tools" },
  { icon: Building2, label: "Commercial workflows" },
];

const funding = [
  ["Engineering + data infrastructure", "₦52.5m", "35%"],
  ["Ground-truth sensor pilot + validation", "₦37.5m", "25%"],
  ["Institutional sales + go-to-market", "₦37.5m", "25%"],
  ["Compliance, CAC + IP protection", "₦15m", "10%"],
  ["Working capital", "₦7.5m", "5%"],
];

export default function PitchPage() {
  return (
    <main className="bg-[#071713] text-white">
      <div className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#071713]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2 text-sm font-bold text-white/75 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Exit pitch</a>
          <div className="flex items-center gap-3"><Link href="/investor-readiness" className="hidden text-xs font-black text-[#d9ff57] sm:inline">Investor + TRL 6 proof</Link><div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-black uppercase tracking-[.18em]"><Radio className="h-3.5 w-3.5 text-[#d9ff57]" /> Live product pitch</div></div>
        </div>
      </div>

      <section className="relative flex min-h-screen items-end overflow-hidden border-b border-white/10 px-4 pb-16 pt-28 sm:px-6 sm:pb-20 lg:px-8">
        <div className="pointer-events-none absolute -right-32 top-24 h-[34rem] w-[34rem] rounded-full bg-[#225d49]/28 blur-3xl" />
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div className="relative"><p className="text-xs font-black uppercase tracking-[.25em] text-[#d9ff57]">NaijaClimaGuard</p><h1 className="mt-5 max-w-5xl font-display text-6xl font-black leading-[.9] tracking-[-.05em] text-white sm:text-7xl lg:text-[7rem]">Nigeria&apos;s climate-risk action operating system.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-white/65">Not another flood map. A system designed to make trusted climate intelligence usable, assignable, deliverable and economically measurable.</p><div className="mt-8 flex flex-wrap gap-2">{["Agency briefing", "Investor pitch", "Competition final"].map((room) => <span key={room} className="rounded-full border border-white/15 px-4 py-2 text-xs font-black text-white/75">{room}</span>)}</div></div>
          <div className="relative aspect-video overflow-hidden rounded-[2rem] border border-white/15 bg-[#102820]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(217,255,87,.2),transparent_35%),linear-gradient(135deg,#13382e,#071713)]" /><div className="absolute inset-0 flex flex-col items-center justify-center text-center"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#d9ff57] text-[#071713]"><Play className="ml-1 h-7 w-7 fill-current" /></div><p className="mt-5 font-black">Founder film placement</p><p className="mt-1 text-xs text-white/45">Problem → product → proof → ask</p></div></div>
        </div>
      </section>

      {openingSections.map((section) => <PitchStatement key={section.n} {...section} />)}

      <section className="border-b border-white/10 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.22em] text-[#d9ff57]">04 · One story, three rooms</p><h2 className="mt-4 max-w-5xl font-display text-4xl font-black leading-tight text-white sm:text-6xl">The core product stays the same. The decision at the end changes.</h2><div className="mt-12 grid border-y border-white/15 lg:grid-cols-3"><Room icon={Landmark} title="Agencies" body="Run beside existing official systems, strengthen last-mile delivery, preserve authority and produce an auditable action record." /><Room icon={WalletCards} title="Investors" body="Fund the data, field proof and distribution layer that turns a working product into repeatable institutional revenue." bordered /><Room icon={Target} title="Finals and judges" body="Inspect the innovation, working experience, claim discipline, national relevance and shortest honest route to TRL 6." bordered /></div></div>
      </section>

      <section className="border-b border-white/10 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.22em] text-[#d9ff57]">05 · What already exists</p><h2 className="mt-4 max-w-4xl font-display text-4xl font-black leading-tight text-white sm:text-6xl">The national proposition sits on top of working product capability.</h2><div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{capabilities.map(({ icon: Icon, label }) => <div key={label} className="border-t border-white/15 py-5"><Icon className="h-5 w-5 text-[#d9ff57]" /><p className="mt-5 font-black">{label}</p></div>)}</div><p className="mt-8 max-w-3xl text-sm leading-7 text-white/55">The public derived-v2 engine supports coordinate-based risk checks and saved-place workflows across the 36-state + FCT product registry. That is national product coverage, not a claim of nationally validated model accuracy.</p></div>
      </section>

      <section className="border-b border-white/10 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.72fr_1.28fr]"><div><p className="text-xs font-black uppercase tracking-[.22em] text-[#d9ff57]">06 · Evidence, not theatre</p><h2 className="mt-4 font-display text-5xl font-black leading-tight text-white">The proof is narrow, frozen and inspectable.</h2><p className="mt-6 text-sm leading-7 text-white/58">Riverine Watch v1 is a separate 14-day shadow candidate for Lokoja and Makurdi. Its limits travel with every headline.</p><Link href="/model-evidence" className="mt-7 inline-flex items-center gap-2 font-black text-[#d9ff57]">Inspect the evidence pack <ArrowRight className="h-4 w-4" /></Link></div><div className="grid border-y border-white/15 sm:grid-cols-2">{[["4 / 5","eligible historical onsets detected"],["26.7%","alert-episode precision"],["1.83","false alert episodes / location-year"],["0.176 / 0.837","PR-AUC / ROC-AUC"]].map(([value,label],index) => <div key={label} className={`p-6 ${index%2 ? "sm:border-l sm:border-white/12" : ""} ${index>1 ? "border-t border-white/12" : index ? "border-t border-white/12 sm:border-t-0" : ""}`}><p className="font-display text-4xl font-black text-[#d9ff57]">{value}</p><p className="mt-3 text-sm font-bold text-white/65">{label}</p></div>)}</div></div>
      </section>

      <section className="border-b border-white/10 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.22em] text-[#d9ff57]">07 · GloFAS workstream</p><h2 className="mt-4 max-w-5xl font-display text-4xl font-black leading-tight text-white sm:text-6xl">Show the technical work honestly—and make the promotion gate part of the moat.</h2><div className="mt-12 grid border-y border-white/15 lg:grid-cols-3"><Roadmap icon={Waves} label="Live now" title="Public derived-v2" body="Coordinate-based decision support, official-warning overlay and action workflows. It does not claim to be the GloFAS shadow model." /><Roadmap icon={Database} label="Frozen proof" title="Preserved GloFAS replay" body="Riverine Watch v1 deterministically scores a preserved NASA IMERG + GloFAS operational bundle for two locations." bordered /><Roadmap icon={FlaskConical} label="In validation" title="Operational ensemble integration" body="Freshness checks, prospective archiving, false-warning burden, field usability and independent review must pass before promotion." bordered /></div><p className="mt-8 border-l-4 border-[#d9ff57] pl-5 text-sm font-bold leading-7 text-white/70">This is not “waiting months for a connection.” It is a controlled evidence programme: use preserved operational inputs now, run prospectively beside official systems, and promote only after the field gates pass.</p></div>
      </section>

      <section className="bg-[#d9ff57] px-4 py-24 text-[#071713] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.22em]">08 · Economic engine</p><h2 className="mt-4 max-w-5xl font-display text-5xl font-black leading-[.98] tracking-tight sm:text-7xl">The number that matters is not only probability. It is the value of acting early.</h2><div className="mt-10 grid gap-4 md:grid-cols-3"><PitchMetric icon={CircleDollarSign} title="₦ exposure" text="What people, assets and economic activity sit in the path of risk?" /><PitchMetric icon={Shield} title="₦ action" text="What intervention can reduce harm before impact?" /><PitchMetric icon={BarChart3} title="Benefit / cost" text="What verified value did that intervention protect per naira spent?" /></div><p className="mt-8 max-w-3xl text-sm font-bold leading-7 text-[#163129]/70">The $6.68bn 2022 direct flood-damage estimate is a historical World Bank reference—not NaijaClimaGuard revenue and not claimed savings.</p><Link href="/impact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#071713] px-6 py-3.5 font-black text-white">Open scenario engine <ArrowRight className="h-4 w-4" /></Link></div>
      </section>

      <section className="border-b border-white/10 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2"><div><p className="text-xs font-black uppercase tracking-[.22em] text-[#d9ff57]">09 · Revenue</p><h2 className="mt-4 font-display text-5xl font-black leading-tight text-white">One intelligence layer. Multiple institutional buyers.</h2><div className="mt-8 divide-y divide-white/10">{["Government command and anticipatory-action intelligence","Insurance and reinsurance risk intelligence","Banks and agricultural lenders","Logistics and infrastructure operators","Agribusiness and large asset owners","Commercial climate-risk APIs"].map((item) => <div key={item} className="flex gap-3 py-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#d9ff57]" /><span className="font-semibold text-white/75">{item}</span></div>)}</div></div><div className="border-y border-white/15"><p className="py-5 text-xs font-black uppercase tracking-[.18em] text-white/45">Internal revenue model · projections, not booked revenue</p>{[["Year 1","₦18m","Pilots and first institutional contracts"],["Year 2","₦210m","Repeatable institutional and portfolio sales"],["Year 3","₦960m","Scaled contracts, data products and API revenue"]].map(([year,value,note]) => <div key={year} className="grid grid-cols-[auto_1fr] gap-6 border-t border-white/12 py-6"><div><p className="text-xs font-black text-[#d9ff57]">{year}</p><p className="mt-2 font-display text-3xl font-black">{value}</p></div><p className="self-end text-sm leading-6 text-white/55">{note}</p></div>)}</div></div>
      </section>

      <section className="border-b border-white/10 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.22em] text-[#d9ff57]">10 · Nigerian economic participation</p><h2 className="mt-4 max-w-4xl font-display text-4xl font-black leading-tight text-white sm:text-6xl">A resilience network can create work around prevention, not only disaster response.</h2><div className="mt-10 grid gap-4 md:grid-cols-3"><Job icon={Users} title="Community intelligence" body="Local verification, communication and field-evidence workflows." /><Job icon={Sprout} title="Resilience services" body="Farm, drainage, infrastructure and preparedness service providers." /><Job icon={Building2} title="Risk operations" body="Assessment, implementation, monitoring and verification roles around institutions." /></div></div>
      </section>

      <section className="px-4 py-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><div className="grid gap-12 lg:grid-cols-[.78fr_1.22fr]"><div><p className="text-xs font-black uppercase tracking-[.22em] text-[#d9ff57]">11 · The ask</p><h2 className="mt-4 font-display text-5xl font-black leading-[.98] tracking-tight text-white sm:text-7xl">₦150 million to cross the evidence and adoption gap.</h2><p className="mt-7 max-w-xl text-lg leading-8 text-white/60">Approximately US$95k at the planning exchange rate. The naira amount is the governing ask for a 12-month evidence and commercialisation programme.</p></div><div className="border-y border-white/15">{funding.map(([label,value,percent],index) => <div key={label} className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 py-5 ${index ? "border-t border-white/10" : ""}`}><span className="text-sm font-bold text-white/72">{label}</span><strong className="font-mono text-sm text-[#d9ff57]">{value}</strong><span className="w-10 text-right text-xs font-black text-white/38">{percent}</span></div>)}</div></div><div className="mt-12 grid gap-4 md:grid-cols-3"><Milestone icon={Clock3} title="Field proof" body="Signed relevant-environment demonstration, representative users and safety drill." /><Milestone icon={Route} title="Operational data" body="Prospective source archive, ground truth and controlled GloFAS promotion path." /><Milestone icon={Network} title="Repeatable adoption" body="Agency and institutional pilots converted into procurement-ready case evidence." /></div><div className="mt-12 flex flex-col gap-3 sm:flex-row"><a href="/" className="rounded-full bg-[#d9ff57] px-6 py-3.5 text-center font-black text-[#071713]">Explore the product</a><Link href="/investor-readiness" className="rounded-full border border-white/20 px-6 py-3.5 text-center font-black text-white">Inspect Investor + TRL 6 proof</Link><Link href="/api-docs" className="rounded-full border border-white/20 px-6 py-3.5 text-center font-black text-white">Explore the API</Link></div></div>
      </section>
    </main>
  );
}

function PitchStatement({ n, title, body }: { n: string; title: string; body: string }) {
  return <section className="border-b border-white/10 px-4 py-24 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.25fr_.75fr]"><div className="text-sm font-black text-[#d9ff57]">{n}</div><div><h2 className="max-w-4xl font-display text-4xl font-black leading-[1.03] text-white sm:text-6xl">{title}</h2><p className="mt-6 max-w-3xl text-lg leading-8 text-white/60">{body}</p></div></div></section>;
}

function Room({ icon: Icon, title, body, bordered = false }: { icon: LucideIcon; title: string; body: string; bordered?: boolean }) {
  return <article className={`py-8 lg:px-8 ${bordered ? "border-t border-white/12 lg:border-l lg:border-t-0" : "lg:pr-8"}`}><Icon className="h-6 w-6 text-[#d9ff57]" /><h3 className="mt-8 font-display text-3xl font-black text-white">{title}</h3><p className="mt-4 text-sm leading-7 text-white/58">{body}</p></article>;
}

function Roadmap({ icon: Icon, label, title, body, bordered = false }: { icon: LucideIcon; label: string; title: string; body: string; bordered?: boolean }) {
  return <article className={`py-8 lg:px-8 ${bordered ? "border-t border-white/12 lg:border-l lg:border-t-0" : "lg:pr-8"}`}><Icon className="h-6 w-6 text-[#d9ff57]" /><p className="mt-8 text-xs font-black uppercase tracking-[.16em] text-white/38">{label}</p><h3 className="mt-3 font-display text-3xl font-black text-white">{title}</h3><p className="mt-4 text-sm leading-7 text-white/58">{body}</p></article>;
}

function PitchMetric({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="border-t-2 border-[#071713] py-6"><Icon className="h-7 w-7" /><p className="mt-8 text-3xl font-black">{title}</p><p className="mt-2 text-sm text-[#071713]/62">{text}</p></div>;
}

function Job({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return <div className="border-t border-white/15 py-7"><Icon className="h-6 w-6 text-[#d9ff57]" /><h3 className="mt-7 text-2xl font-black text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-white/55">{body}</p></div>;
}

function Milestone({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return <div className="border-t border-white/15 py-6"><Icon className="h-5 w-5 text-[#d9ff57]" /><h3 className="mt-6 text-xl font-black text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-white/52">{body}</p></div>;
}
