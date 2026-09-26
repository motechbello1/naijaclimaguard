"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, BadgeCheck, Clock3, MapPin, Radio, ShieldCheck, Waves } from "lucide-react";
import FpShell from "@/components/floodpass/FpShell";

type Risk = {
  public_status?: "DANGER" | "BE_CAREFUL" | "NO_WARNING_YET";
  safety_state?: { active: boolean; instruction: string; authority?: string; sourceName?: string; sourceUrl?: string };
};
type Coverage = { lgasWatched: number; lastRainScanAt: string | null };
type Recent = { passes?: Array<{ code: string; placeName: string; state: string | null; floodedAt: string; seeded: boolean }> };

const HERO_IMAGE = "https://images.unsplash.com/photo-1741110539426-fce3268c3c0d?auto=format&fit=crop&fm=jpg&q=82&w=1800";

function PlaceBrief() {
  const [state, setState] = useState<"idle" | "locating" | "loading" | "done" | "error">("idle");
  const [risk, setRisk] = useState<Risk | null>(null);
  const [message, setMessage] = useState("");
  function check() {
    if (!("geolocation" in navigator)) { setState("error"); setMessage("This device cannot share a location. You can still read the national coverage and official guidance."); return; }
    setState("locating");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setState("loading");
      try {
        const response = await fetch(`/api/v1/risk?latitude=${coords.latitude}&longitude=${coords.longitude}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Risk feed unavailable");
        setRisk((await response.json()) as Risk); setState("done");
      } catch { setState("error"); setMessage("The live check is unavailable. Follow visible conditions and official updates."); }
    }, () => { setState("error"); setMessage("Location was not shared. You can still see coverage and reporting guidance."); }, { enableHighAccuracy: true, timeout: 15000 });
  }
  const warning = risk?.safety_state?.active ? risk.safety_state : null;
  const status = risk?.public_status === "DANGER" ? "Danger: act now" : risk?.public_status === "BE_CAREFUL" ? "Be careful" : "No warning found for this area";
  return <div className="ncg-brief-action">
    {state === "done" ? <div className={`ncg-brief-result ${risk?.public_status === "DANGER" ? "ncg-danger" : risk?.public_status === "BE_CAREFUL" ? "ncg-caution" : ""}`} role="status" aria-live="polite">
      <span className="ncg-kicker">YOUR AREA / CURRENT CONTEXT</span><strong>{status}</strong>
      <p>{warning?.instruction ?? "No warning in our connected sources is not proof of safety. Watch for rising water and follow official advice."}</p>
      <small>Source: {warning ? `${warning.authority ?? "Official authority"}${warning.sourceName ? ` via ${warning.sourceName}` : ""}` : "Open-Meteo weather context and connected advisories"}{warning?.sourceUrl ? <> · <a href={warning.sourceUrl} target="_blank" rel="noreferrer">Read the source</a></> : null}</small>
      <button type="button" className="ncg-inline-button" onClick={check}>Check again <ArrowRight size={15} /></button>
    </div> : <><div className="ncg-brief-icon"><MapPin size={25} strokeWidth={1.7} /></div><h3>Start with your place.</h3>
      <p>Use your location once to see the context available for the place you are standing.</p>
      <button type="button" className="ncg-brief-button" onClick={check} disabled={state === "locating" || state === "loading"}>{state === "locating" ? "Finding your location…" : state === "loading" ? "Reading current context…" : "Check my area"}<ArrowUpRight size={18} /></button>
      {state === "error" ? <p className="ncg-brief-error" role="alert">{message}</p> : <small>Your location is used for this check. We do not save it from this page.</small>}</>}
  </div>;
}

function VerifyCode() {
  const [code, setCode] = useState(""); const router = useRouter();
  return <form className="ncg-verify-form" onSubmit={(event) => { event.preventDefault(); if (code.trim()) router.push(`/check?code=${encodeURIComponent(code.trim())}`); }}>
    <label htmlFor="ncg-code">Have a FloodPass code?</label><div><input id="ncg-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="FP-ABJ-XXXX" autoCapitalize="characters" autoComplete="off" /><button type="submit" aria-label="Check the FloodPass code"><ArrowRight size={19} /></button></div>
    <small>The example is a code format, not a live record.</small>
  </form>;
}

function HomeBody() {
  const [coverage, setCoverage] = useState<Coverage | null>(null); const [recent, setRecent] = useState<Recent | null>(null);
  useEffect(() => {
    fetch("/api/floodpass/coverage", { cache: "no-store" }).then((res) => res.ok ? res.json() : null).then(setCoverage).catch(() => setCoverage(null));
    fetch("/api/floodpass/recent?limit=3", { cache: "no-store" }).then((res) => res.ok ? res.json() : null).then(setRecent).catch(() => setRecent(null));
  }, []);
  return <div className="ncg-home">
    <section className="ncg-hero" aria-labelledby="ncg-hero-title">
      <div className="ncg-hero-copy"><div className="ncg-eyebrow"><span className="ncg-signal" /> NAIJACLIMAGUARD / FLOOD INTELLIGENCE FOR PEOPLE</div>
        <h1 id="ncg-hero-title">Know before.<br /><em>Act together.</em><br />Prove after.</h1>
        <p>See the warning for your area. Report the water you see. Keep a record others can check. One clear path from risk to action.</p>
        <div className="ncg-hero-actions"><a className="ncg-cta ncg-cta-lime" href="#today">Check my area <ArrowUpRight size={18} /></a><Link className="ncg-cta ncg-cta-outline" href="/floodpass/report">Report water <ArrowRight size={18} /></Link></div>
        <div className="ncg-hero-foot"><span><ShieldCheck size={16} /> Official warnings take priority</span><span>Public safety information is free</span></div>
      </div>
      <div className="ncg-hero-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={HERO_IMAGE} alt="People gathered by homes during a flood" />
        <div className="ncg-image-label"><span>01 / THE HUMAN STORY</span><strong>What happens on a street matters.</strong></div><small>Illustrative photograph / Unsplash</small>
      </div><a className="ncg-scroll-cue" href="#today" aria-label="Scroll to today's brief"><ArrowDown size={18} /></a>
    </section>
    <div className="ncg-pillar-strip" aria-label="How the service works"><span><b>01</b> Understand the risk</span><span><b>02</b> Report what happened</span><span><b>03</b> Check the evidence</span></div>
    <section className="ncg-today ncg-section" id="today" aria-labelledby="ncg-today-title"><div className="ncg-section-head"><div><span className="ncg-kicker">THE DAILY BRIEF / YOUR PLACE</span><h2 id="ncg-today-title">A clearer picture <em>starts here.</em></h2></div><p>Check when you need to make a decision. An official warning always takes priority over a model score.</p></div>
      <div className="ncg-brief-grid"><PlaceBrief /><div className="ncg-brief-data"><div className="ncg-data-header"><span className="ncg-live-dot" /> CONNECTED WEATHER CONTEXT <Waves size={22} /></div><strong>{coverage?.lgasWatched ? coverage.lgasWatched.toLocaleString("en-NG") : "—"}<span> LGA centres</span></strong><p>Rainfall context is scanned across the country. This describes a data check, not a validated prediction for every street.</p><div className="ncg-data-bottom"><Clock3 size={16} /> {coverage?.lastRainScanAt ? `Last scan ${new Date(coverage.lastRainScanAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} WAT` : "Latest scan unavailable"}</div><Link href="/floodpass/coverage">See where the evidence comes from <ArrowUpRight size={16} /></Link></div></div>
    </section>
    <section className="ncg-actions ncg-section" aria-labelledby="ncg-actions-title"><div className="ncg-section-head"><div><span className="ncg-kicker">WHAT YOU CAN DO</span><h2 id="ncg-actions-title">Three actions. <em>One connected story.</em></h2></div></div>
      <div className="ncg-actions-grid"><Link href="/floodpass/coverage" className="ncg-action-card"><span>01 / BEFORE</span><Radio size={35} strokeWidth={1.45} /><h3>Understand your area.</h3><p>Read weather context, known flood spots and the limits of what we know.</p><b>Explore coverage <ArrowUpRight size={18} /></b></Link><Link href="/floodpass/report" className="ncg-action-card ncg-action-feature"><span>02 / DURING</span><Waves size={35} strokeWidth={1.45} /><h3>Tell us about water.</h3><p>Report where it is and how deep. A photo helps. You do not need an account.</p><b>Report water <ArrowUpRight size={18} /></b></Link><div className="ncg-action-card"><span>03 / AFTER</span><BadgeCheck size={35} strokeWidth={1.45} /><h3>Check a record.</h3><p>See what was reported, when, and what checks supported the result.</p><VerifyCode /></div></div>
    </section>
    <section className="ncg-workspace ncg-section" aria-labelledby="ncg-workspace-title"><div><span className="ncg-kicker">YOUR WORKSPACE / ONE ACCOUNT</span><h2 id="ncg-workspace-title">The right tools for <em>your life.</em></h2><p>Save the places you protect and choose a view for home and family, farming, business or agency response. Your workspace brings your alerts, actions, evidence and location tools together.</p><div className="ncg-workspace-actions"><Link className="ncg-cta ncg-cta-dark" href="/register">Create a free account <ArrowUpRight size={18} /></Link><Link className="ncg-cta ncg-cta-text" href="/dashboard">Open my workspace <ArrowRight size={18} /></Link></div></div><div className="ncg-workspace-roles"><span>HOME & FAMILY</span><span>FARMER</span><span>BUSINESS</span><span>AGENCY</span><small>Change your view inside the workspace.</small></div></section>
    <section className="ncg-decision ncg-section" aria-labelledby="ncg-decision-title"><div className="ncg-decision-copy"><span className="ncg-kicker">THE REASON WE EXIST</span><h2 id="ncg-decision-title">A warning is a start.<br /><em>A decision is the point.</em></h2><p>For a family, the decision may be when to move. For a response team, it may be where to send help. For a lender or insurer, it may be what evidence to review. NaijaClimaGuard joins the warning, the observation and the record without pretending any one of them is certainty.</p><Link className="ncg-cta ncg-cta-lime" href="/partners">Work with the evidence <ArrowUpRight size={18} /></Link></div><div className="ncg-decision-graphic" aria-label="Warning, local report, checked record, decision"><div><span>01</span><strong>OFFICIAL SIGNAL</strong><small>Source and time attached</small></div><div><span>02</span><strong>LOCAL OBSERVATION</strong><small>A person reports what they see</small></div><div><span>03</span><strong>CHECKABLE RECORD</strong><small>Evidence and limits are visible</small></div><div><span>04</span><strong>A BETTER DECISION</strong><small>A partner remains accountable</small></div></div></section>
    <section className="ncg-record ncg-section" aria-labelledby="ncg-record-title"><div className="ncg-section-head"><div><span className="ncg-kicker">THE FLOOD RECORD</span><h2 id="ncg-record-title">Trust is built <em>in public.</em></h2></div><p>Each issued FloodPass can be checked by code. A report checked by software is different from a report independently confirmed in the field.</p></div><div className="ncg-record-grid"><div className="ncg-record-list">{recent?.passes?.length ? recent.passes.map((pass) => <Link href={`/pass/${pass.code}`} key={pass.code}><span>{pass.seeded ? "RECONSTRUCTED FROM NEWS" : "COMMUNITY REPORT"}</span><strong>{pass.placeName}{pass.state ? `, ${pass.state}` : ""}</strong><small>{new Date(pass.floodedAt).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "long", year: "numeric" })} · {pass.code}</small><ArrowUpRight size={19} /></Link>) : <div className="ncg-record-empty"><BadgeCheck size={33} strokeWidth={1.4} /><strong>First community records are being collected.</strong><p>We will show real records here when they exist. A news-rebuilt demo, if added, will always carry a clear label.</p></div>}</div><div className="ncg-record-aside"><span className="ncg-kicker">NOT A PROMISE OF PAYMENT</span><p>FloodPass is a record of a reported event and its checks. It does not guarantee aid, insurance cover or a payment.</p><Link href="/check">How to check a code <ArrowRight size={16} /></Link></div></div></section>
    <section className="ncg-close ncg-section"><span className="ncg-kicker">A PUBLIC SERVICE / AN INSTITUTIONAL TOOL</span><h2>Useful to a person.<br /><em>Accountable to a country.</em></h2><p>Safety information and reporting stay free. Organisations can pilot evidence workflows and pay for a service when it proves useful in real decisions.</p><div><Link className="ncg-cta ncg-cta-dark" href="/floodpass/report">Report water <ArrowUpRight size={18} /></Link><Link className="ncg-cta ncg-cta-text" href="/partners">Explore institutional pilots <ArrowRight size={18} /></Link></div></section>
    <div className="ncg-home-return"><span>YOU HAVE REACHED THE END / KEEP EXPLORING</span><a href="#fp-content" aria-label="Back to top of page">Back to top <ArrowUp size={18} /></a></div>
  </div>;
}

export default function HomeScreen() { return <FpShell active="home"><HomeBody /></FpShell>; }
