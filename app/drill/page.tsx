"use client";

import AppShell from "@/components/shared/AppShell";
import { useExperienceProfile, type ExperienceRole } from "@/components/shared/ExperienceProfile";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlarmClock, ArrowLeft, Check, CheckCircle2, ClipboardCheck, Flag, Play, RotateCcw, ShieldAlert, TimerReset, TriangleAlert } from "lucide-react";

type DrillPlan = { scenario: string; steps: string[]; debrief: string[] };

const DRILLS: Record<ExperienceRole, DrillPlan> = {
  HOUSEHOLD: {
    scenario: "Practice scenario: a HIGH flood-risk signal appears for your neighbourhood and heavy rain is continuing. No official evacuation order is simulated.",
    steps: ["Tell everyone in the household that this is a practice drill.", "Locate medicines, identity documents and the grab-ready essentials you would take.", "Confirm who would assist children, older people or anyone needing extra help.", "Check that emergency contacts are available offline and phones/power banks can be charged.", "Say out loud what would make you stop the drill and follow a real authority instruction instead."],
    debrief: ["Could everyone find essentials quickly?", "Did anyone depend on information stored only online?", "Is there a person who would need more help in a real event?"],
  },
  FARMER: {
    scenario: "Practice scenario: sustained rainfall and a HIGH flood-risk signal threaten farm access over the next day. This drill does not claim a real flood is coming.",
    steps: ["Tell workers this is a practice drill and identify the stop-work decision owner.", "Identify livestock, feed, seed, chemicals and equipment that would be hardest to replace.", "Choose which movable items would be raised or relocated first if an authority warned of worsening conditions.", "Confirm worker contact details and how you would stop travel through unsafe roads/culverts.", "Take a practice asset/inventory photo and note where it would be stored for later evidence."],
    debrief: ["Were priority assets obvious?", "Could workers be contacted quickly?", "Is any critical stock stored where it could not be moved in time?"],
  },
  BUSINESS: {
    scenario: "Practice scenario: a HIGH flood-risk signal affects a monitored business location during operating hours. No real closure order is being issued.",
    steps: ["Name the person who would own the continuity decision.", "Identify staff in exposed areas and the first communication message you would send.", "Identify critical stock, documents, servers or power equipment that would be moved first.", "Confirm remote-work/closure communication can be sent without staff travelling into risk.", "Record which business decision would need management approval before a real event."],
    debrief: ["Was ownership clear?", "Could staff receive one consistent instruction?", "Which asset still has no practical protection plan?"],
  },
  AGENCY: {
    scenario: "Practice scenario: a fresh authenticated official advisory enters the command queue. This is a simulation and does not represent a real authority warning.",
    steps: ["Identify the duty operator and who is authorised to acknowledge the simulated case.", "State which source/freshness checks must pass before operational action.", "Choose the communities/assets that would require priority review without inventing a new official message.", "State which delivery channels would be checked for readiness and failed delivery.", "Describe what evidence would be recorded for acknowledge, escalation and resolution."],
    debrief: ["Was the escalation owner clear?", "Could the team distinguish source warning from model score?", "Which missing/stale source would most affect confidence in the operational picture?"],
  },
};

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60).toString().padStart(2, "0");
  const seconds = (value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function DrillInner() {
  const { role } = useExperienceProfile();
  const plan = DRILLS[role];
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState<boolean[]>(plan.steps.map(() => false));

  useEffect(() => {
    setStarted(false); setSeconds(0); setDone(DRILLS[role].steps.map(() => false));
  }, [role]);

  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [started]);

  const complete = done.every(Boolean);
  const progress = Math.round((done.filter(Boolean).length / done.length) * 100);
  const summary = useMemo(() => complete ? `Practice drill completed in ${formatSeconds(seconds)}.` : `${done.filter(Boolean).length}/${done.length} practice steps complete.`, [complete, seconds, done]);

  const reset = () => { setStarted(false); setSeconds(0); setDone(plan.steps.map(() => false)); };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/action-center" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold dark:border-midnight-border"><ArrowLeft className="h-4 w-4" /> Action OS</Link><div className="inline-flex items-center gap-2 rounded-full border border-violet-300/50 bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-violet-700 dark:bg-violet-950/20 dark:text-violet-300"><Flag className="h-3.5 w-3.5" /> Simulation only</div></div>

      <section className="overflow-hidden rounded-3xl border border-violet-300/40 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-6 dark:from-violet-950/20 dark:via-midnight-light dark:to-cyan-950/10 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Flood Drill Mode</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Practice the response before the warning is real.</h1><p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{plan.scenario}</p></div>
          <div className="flex min-w-40 flex-col items-center rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-midnight-border dark:bg-midnight/60"><AlarmClock className="h-6 w-6 text-violet-600" /><p className="mt-2 font-mono text-3xl font-black tabular-nums">{formatSeconds(seconds)}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">practice timer</p></div>
        </div>
      </section>

      <div className="rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:bg-amber-950/20 dark:text-amber-100"><div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>This mode never creates or sends a real warning.</strong> It does not change the live model score, contact emergency services, write an operational evidence event or claim that a flood is occurring. Stop the drill immediately if a real official warning or dangerous visible condition appears.</div></div></div>

      {!started ? <button onClick={() => setStarted(true)} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-violet-600 px-5 text-base font-bold text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5"><Play className="h-5 w-5" /> Start 5-minute readiness drill</button> : (
        <section className="glass-card rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Practice checklist</p><h2 className="mt-1 font-display text-2xl font-bold">{summary}</h2></div><div className="text-right"><p className="text-2xl font-black text-violet-600">{progress}%</p><p className="text-[10px] font-bold uppercase text-slate-400">drill progress</p></div></div>
          <div className="mt-5 space-y-3">{plan.steps.map((step, index) => <button key={step} type="button" onClick={() => setDone((current) => current.map((value, i) => i === index ? !value : value))} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${done[index] ? "border-violet-300 bg-violet-50/70 dark:bg-violet-950/10" : "border-slate-200 dark:border-midnight-border"}`}><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${done[index] ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 text-slate-400"}`}>{done[index] ? <Check className="h-4 w-4" /> : index + 1}</span><span className={`text-sm leading-relaxed ${done[index] ? "font-semibold" : "text-slate-600 dark:text-slate-300"}`}>{step}</span></button>)}</div>
          <div className="mt-5 flex flex-wrap gap-2"><button onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold dark:border-midnight-border"><RotateCcw className="h-4 w-4" /> Reset drill</button>{complete && <Link href="/action-center" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-radar px-4 text-sm font-bold text-white"><ClipboardCheck className="h-4 w-4" /> Improve my readiness</Link>}</div>
        </section>
      )}

      {complete && <section className="rounded-3xl border border-emerald-300/50 bg-emerald-50 p-5 dark:bg-emerald-950/10 sm:p-6"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" /><div><h2 className="font-display text-xl font-bold text-emerald-800 dark:text-emerald-200">Practice complete</h2><p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-100/80">Use the debrief to find weaknesses before a real event.</p><ul className="mt-4 space-y-2">{plan.debrief.map((item) => <li key={item} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{item}</li>)}</ul></div></div></section>}

      <div className="flex items-center gap-2 text-xs text-slate-500"><TimerReset className="h-4 w-4" />Drill completion is local practice information only and is not recorded as emergency-response evidence.</div>
    </div>
  );
}

export default function DrillPage() {
  return <AppShell><DrillInner /></AppShell>;
}
