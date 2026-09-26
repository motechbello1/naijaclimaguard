"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, BadgeCheck, CircleHelp, MapPin, Radio, ShieldCheck, Smartphone, Waves } from "lucide-react";
import FpShell, { HearButton, useFp, whatsappLink } from "@/components/floodpass/FpShell";

type Risk = {
  public_status?: "DANGER" | "BE_CAREFUL" | "NO_WARNING_YET";
  safety_state?: { active: boolean; headline: string | null; instruction: string; authority?: string; sourceName?: string; sourceUrl?: string };
};

type Recent = {
  passes?: Array<{ code: string; placeName: string; state: string | null; floodedAt: string; depthWords: string; seeded: boolean }>;
  hotspots?: Array<{ id: string; name: string; area: string; lastReported: string }>;
};

const STATUS = {
  DANGER: { cls: "fp-status-red", en: "Danger: act now", pcm: "Danger: act now now" },
  BE_CAREFUL: { cls: "fp-status-amber", en: "Be careful", pcm: "Shine your eye" },
  NO_WARNING_YET: { cls: "fp-status-blue", en: "No warning for your area yet", pcm: "No warning for your area yet" },
} as const;

function StreetStatus() {
  const { lang, tr } = useFp();
  const [state, setState] = useState<"idle" | "locating" | "loading" | "done" | "error">("idle");
  const [risk, setRisk] = useState<Risk | null>(null);
  const [message, setMessage] = useState("");

  function check() {
    if (!("geolocation" in navigator)) { setState("error"); setMessage("This device cannot share its location."); return; }
    setState("locating");
    navigator.geolocation.getCurrentPosition(async (position) => {
      setState("loading");
      try {
        const response = await fetch(`/api/v1/risk?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`, { cache: "no-store" });
        if (!response.ok) throw new Error("risk unavailable");
        setRisk((await response.json()) as Risk);
        setState("done");
      } catch {
        setState("error");
        setMessage("We could not get current conditions. Please try again and follow official updates.");
      }
    }, () => { setState("error"); setMessage("Location was not shared. You can still report water or check a FloodPass."); }, { enableHighAccuracy: true, timeout: 15000 });
  }

  const status = risk?.public_status;
  const look = status ? STATUS[status] : null;
  const safety = risk?.safety_state?.active ? risk.safety_state : null;
  const headline = look ? (lang === "pcm" ? look.pcm : look.en) : "Current status unavailable";
  const who = safety ? `${safety.authority ?? "Official source"}${safety.sourceName ? ` (via ${safety.sourceName})` : ""}` : "Weather context from Open-Meteo";
  const spoken = `${headline}. ${safety ? safety.instruction : "No warning is not proof of safety. Watch for rising water and follow official updates."} Source: ${who}.`;

  return (
    <section className="fp-street-card" aria-labelledby="fp-street-title">
      <div className="fp-street-top"><MapPin size={16} aria-hidden="true" /> YOUR PLACE, RIGHT NOW</div>
      <h3 id="fp-street-title">What is happening near you?</h3>
      {state !== "done" ? (
        <>
          <p className="fp-muted" style={{ maxWidth: 500, margin: "0 0 24px" }}>Use your location to see the available flood context for your area. If you see water, report it even when no warning appears.</p>
          <button className="fp-btn fp-btn-primary" onClick={check} disabled={state === "locating" || state === "loading"}>
            {state === "locating" ? "Finding your location..." : state === "loading" ? "Checking conditions..." : tr("myStreet")}
            {state === "idle" || state === "error" ? <ArrowUpRight size={17} aria-hidden="true" /> : null}
          </button>
          {state === "error" ? <p role="alert" className="fp-muted fp-small">{message}</p> : <p className="fp-page-note" style={{ marginTop: 13 }}>Your location is used for this check.</p>}
        </>
      ) : (
        <div className={`fp-status ${look?.cls ?? "fp-status-amber"} fp-stack`} role="status" aria-live="polite">
          <p style={{ margin: 0, fontSize: 25, fontWeight: 900, letterSpacing: "-.04em" }}>{headline}</p>
          <p style={{ margin: 0 }}>{safety ? safety.instruction : "No warning is not proof of safety. Watch for rising water and follow official updates."}</p>
          <p className="fp-small" style={{ margin: 0, fontWeight: 800 }}>Source: {who}{safety?.sourceUrl ? <> · <a href={safety.sourceUrl} target="_blank" rel="noreferrer">Read it</a></> : null}</p>
          <div className="fp-row"><HearButton text={spoken} /><button className="fp-chip" onClick={check}>Check again</button></div>
        </div>
      )}
    </section>
  );
}

function CheckBox() {
  const router = useRouter();
  const { tr } = useFp();
  const [code, setCode] = useState("");
  return (
    <form className="fp-action" onSubmit={(event) => { event.preventDefault(); if (code.trim()) router.push(`/check?code=${encodeURIComponent(code.trim())}`); }}>
      <div className="fp-action-icon"><BadgeCheck size={24} aria-hidden="true" /></div>
      <h3>{tr("checkCode")}</h3>
      <p>See what a FloodPass says and how it was checked.</p>
      <label className="sr-only" htmlFor="fp-home-code">FloodPass code</label>
      <input id="fp-home-code" className="fp-input" placeholder="FP-ABJ-7K2Q" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" />
      <button className="fp-btn fp-btn-ghost" type="submit">Check the code <ArrowRight size={16} aria-hidden="true" /></button>
    </form>
  );
}

function FloodsNow() {
  const [data, setData] = useState<Recent | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    fetch("/api/floodpass/recent?limit=5", { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("not available"); return response.json(); })
      .then((json: Recent) => setData(json))
      .catch(() => setUnavailable(true));
  }, []);
  return (
    <div>
      {data?.passes?.length ? (
        <ul className="fp-record-list">
          {data.passes.map((pass) => (
            <li key={pass.code}>
              <Link href={`/pass/${pass.code}`}>{pass.placeName}{pass.state ? `, ${pass.state}` : ""} <ArrowUpRight size={16} aria-hidden="true" style={{ display: "inline" }} /></Link>
              <p className="fp-muted fp-small" style={{ margin: "4px 0 0" }}>
                {new Date(pass.floodedAt).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" })} · Water {pass.depthWords}{pass.seeded ? " · reconstructed demo" : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fp-muted" style={{ margin: "0 0 22px" }}>{unavailable ? "Recent records are unavailable right now." : data ? "No recent FloodPass records to show." : "Loading recent records..."}</p>
      )}
      {data?.hotspots?.length ? <details className="fp-card" style={{ boxShadow: "none", marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>Known Abuja flood spots ({data.hotspots.length})</summary>
        <ul style={{ margin: "12px 0 0", paddingLeft: 20 }}>{data.hotspots.map((spot) => <li key={spot.id}>{spot.name}, {spot.area}</li>)}</ul>
        <p className="fp-muted fp-small">From news reports. Exact locations still need checks on the ground.</p>
      </details> : null}
    </div>
  );
}

function HomeBody() {
  const { lang, tr } = useFp();
  const wa = whatsappLink(lang === "pcm" ? "How far" : "Hi");

  useEffect(() => {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = document.querySelectorAll<HTMLElement>(".fp-reveal");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add("fp-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: .08, rootMargin: "0px 0px -30px 0px" });
    items.forEach((item) => { item.classList.add("fp-await"); observer.observe(item); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="fp-home">
      <div>
        <section className="fp-hero" aria-labelledby="fp-hero-title">
          <div className="fp-hero-inner">
            <div className="fp-hero-copy">
              <div className="fp-hero-eyebrow"><span /> A CLEARER WAY THROUGH FLOOD</div>
              <h1 id="fp-hero-title">{lang === "pcm" ? <>Flood dey move fast.<br /><em>Help suppose move too.</em></> : <>Floods move fast.<br /><em>Help should too.</em></>}</h1>
              <p className="fp-hero-lead">{tr("lead")} Warnings and proof are free.</p>
              <div className="fp-hero-actions">
                <Link className="fp-btn fp-btn-primary" href="/floodpass/report">{tr("waterHere")} <ArrowUpRight size={17} aria-hidden="true" /></Link>
                <Link className="fp-btn fp-btn-ghost" href="/check">{tr("check")} a pass <ArrowRight size={17} aria-hidden="true" /></Link>
              </div>
              <p className="fp-hero-small">In immediate danger? Move to higher ground and call 112.</p>
            </div>
            <div className="fp-hero-art" aria-hidden="true">
              <div className="fp-map-plate">
                <span className="fp-art-index">FLOODPASS / FIELD NOTES / 01</span>
                <svg viewBox="0 0 520 520" role="presentation">
                  <g className="fp-map-contours">
                    <path d="M-38 82C56-40 147 62 248 23s140-38 214 32 70 19 104-22M-48 120C58 12 158 88 243 57S388 13 465 89s57 40 102 1M-44 158C54 40 166 123 250 91s148 5 212 45 79 23 116-15M-46 195C62 75 172 158 259 126s135 5 205 50 83 12 112-19M-50 231C67 103 178 197 268 161s141 2 209 47 77 31 111-17M-38 274C83 150 180 225 282 192s142 12 201 56 82 7 103-12M-32 310C88 185 196 258 285 225s130 8 194 62 86 12 114-12M-17 349C99 220 201 287 302 259s130 5 194 66 85 18 110-15M-14 386C113 258 207 319 308 293s134 21 186 67 88 24 109-11M-13 422C113 291 224 355 326 326s127 23 178 65 91 24 109-5M-9 458C127 326 224 384 334 365s116 31 181 64 80 9 96-7" />
                  </g>
                  <path className="fp-map-river" d="M-40 252C75 140 152 260 242 194s124-62 187 17 129 85 180 8" />
                </svg>
                <span className="fp-map-point" />
                <span className="fp-map-label">A PLACE / A RECORD</span>
                <div className="fp-art-ticket">
                  <div className="fp-ticket-top"><span>FLOODPASS / PROOF CARD</span><span>EXAMPLE</span></div>
                  <div className="fp-ticket-title">A place. A time. A record.</div>
                  <span className="fp-ticket-code">FP-ABJ-••••</span>
                  <div className="fp-ticket-foot"><span>CHECKABLE EVIDENCE</span><span>ILLUSTRATION ONLY</span></div>
                </div>
                <span className="fp-art-caption">REPORT → CHECK → RECORD</span>
              </div>
            </div>
          </div>
        </section>
        <div className="fp-principles" aria-label="FloodPass principles">
          <div><b>01</b><span>Official warnings come first</span></div>
          <div><b>02</b><span>Community reports add evidence</span></div>
          <div><b>03</b><span>Anyone can check a FloodPass</span></div>
        </div>
      </div>

      <section className="fp-reveal" aria-labelledby="fp-area-heading">
        <div className="fp-section-heading"><div><p className="fp-overline">KNOW YOUR PLACE</p><h2 id="fp-area-heading">The right information, where you are.</h2></div><p>One check for your area. Warnings name their source. The absence of a warning is not proof of safety.</p></div>
        <div className="fp-status-layout">
          <StreetStatus />
          <aside className="fp-street-note">
            <ShieldCheck size={32} strokeWidth={1.5} aria-hidden="true" />
            <div><h3>Clarity before confidence.</h3><p>Conditions can change quickly. If water is rising, act on what you can see and follow official guidance.</p></div>
            <Link href="/floodpass/help" style={{ color: "#e4f7f8", fontWeight: 800, fontSize: 13 }}>Flood guidance <ArrowUpRight size={15} aria-hidden="true" style={{ display: "inline" }} /></Link>
          </aside>
        </div>
      </section>

      <section className="fp-reveal" aria-labelledby="fp-actions-heading">
        <div className="fp-section-heading"><div><p className="fp-overline">YOUR NEXT MOVE</p><h2 id="fp-actions-heading">Start with what you need.</h2></div></div>
        <div className="fp-action-grid">
          <Link className="fp-action fp-action-primary" href="/floodpass/report">
            <span className="fp-action-icon"><Radio size={23} aria-hidden="true" /></span><h3>Water here?</h3><p>Tell us where you are and how deep it is. No account needed.</p><ArrowUpRight size={21} className="fp-action-arrow" aria-hidden="true" />
          </Link>
          <CheckBox />
          {wa ? <a className="fp-action" href={wa} target="_blank" rel="noreferrer">
            <span className="fp-action-icon"><Smartphone size={22} aria-hidden="true" /></span><h3>Use WhatsApp</h3><p>Ask for updates and report water in a familiar conversation.</p><ArrowUpRight size={21} className="fp-action-arrow" aria-hidden="true" />
          </a> : <div className="fp-action">
            <span className="fp-action-icon"><Smartphone size={22} aria-hidden="true" /></span><h3>WhatsApp is on its way</h3><p>The number is being connected. You can report water here on the website now.</p>
          </div>}
        </div>
      </section>

      <section className="fp-process fp-reveal" aria-labelledby="fp-how-heading">
        <p className="fp-overline">HOW FLOODPASS WORKS</p>
        <h2 id="fp-how-heading" className="fp-h2" style={{ marginTop: 13 }}>From a warning to a record people can check.</h2>
        <div className="fp-process-grid">
          <div className="fp-process-step"><b>01 / KNOW</b><h3>See the warning</h3><p>We show official warnings with their source. You can check the context for your area.</p></div>
          <div className="fp-process-step"><b>02 / REPORT</b><h3>Tell us what you see</h3><p>Report water with your location and its depth. A photo helps, but is optional.</p></div>
          <div className="fp-process-step"><b>03 / PROVE</b><h3>Keep your FloodPass</h3><p>Reports that pass the checks receive a code others can look up. Checking is free for people.</p></div>
        </div>
        <div style={{ marginTop: 32 }}><HearButton text="See the warning. Report what you see. Keep a FloodPass when your report passes the checks." /></div>
      </section>

      <section className="fp-reveal" aria-labelledby="fp-record-heading">
        <div className="fp-section-heading"><div><p className="fp-overline">THE FLOOD RECORD</p><h2 id="fp-record-heading">What has been recorded.</h2></div><p>Every displayed FloodPass includes a place, time, check status and a link to inspect it.</p></div>
        <div className="fp-record-grid"><FloodsNow /><div className="fp-record-example"><p className="fp-overline">A NOTE ON EVIDENCE</p><strong>Every report starts somewhere.</strong><p>A rebuilt news record is labelled as a demo. A community report goes through the FloodPass checks. You can see the difference on each card.</p></div></div>
      </section>

      <section className="fp-reveal" aria-labelledby="fp-more-heading">
        <div className="fp-section-heading"><div><p className="fp-overline">BEYOND THE WARNING</p><h2 id="fp-more-heading">Make a better next decision.</h2></div></div>
        <div className="fp-services">
          <Link className="fp-service" href="/floodpass/drain-heroes"><Waves size={39} strokeWidth={1.4} aria-hidden="true" /><div><h3>Drain Heroes</h3><p>Spot a blocked drain, help clear it, and follow the neighbour checks for points.</p></div><span className="fp-service-link">Explore the programme <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
          <Link className="fp-service" href="/floodpass/address-check"><MapPin size={38} strokeWidth={1.4} aria-hidden="true" /><div><h3>Rent & land check</h3><p>Look at the flood history we know before you make a decision about a place.</p></div><span className="fp-service-link">Check an address <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
        </div>
      </section>

      <section className="fp-coverage-banner fp-reveal" aria-label="Coverage">
        <strong>36 + FCT</strong><p>Place lookup covers Nigeria. Verified field evidence is growing from the Abuja pilot, so coverage and confidence are shown separately.</p><Link href="/floodpass/coverage">Explore coverage <ArrowUpRight size={15} aria-hidden="true" style={{ display: "inline" }} /></Link>
      </section>
      <section className="fp-reveal" style={{ textAlign: "center", maxWidth: 670, marginInline: "auto" }}>
        <CircleHelp size={28} color="var(--fp-brand)" aria-hidden="true" /><h2 className="fp-h2" style={{ margin: "13px 0" }}>Warnings and proof stay free.</h2><p className="fp-muted" style={{ margin: "0 0 18px" }}>Optional plans add family tools. People do not need to pay to receive the same warnings or report water.</p><Link className="fp-link" href="/floodpass/plans">See what is free and what is extra <ArrowRight size={16} aria-hidden="true" style={{ display: "inline" }} /></Link>
      </section>
    </div>
  );
}

export default function HomeScreen() {
  return <FpShell active="home"><HomeBody /></FpShell>;
}
