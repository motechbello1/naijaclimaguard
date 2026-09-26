"use client";

import Link from "next/link";
import { useState } from "react";
import FpShell, { HearButton, useFp } from "@/components/floodpass/FpShell";
import DepthIcon from "@/components/floodpass/DepthIcon";
import type { Depth } from "@/lib/floodpass/truth-engine";

type Outcome = {
  status: "VERIFIED" | "LIKELY" | "UNCONFIRMED";
  score: number;
  checks: Array<{ key: string; label: string; points: number; max: number; passed: boolean; detail: string }>;
  pass: { code: string } | null;
};

const DEPTHS: Array<{ depth: Depth; en: string; pcm: string }> = [
  { depth: "ANKLE", en: "Ankle", pcm: "Ankle" },
  { depth: "KNEE", en: "Knee", pcm: "Knee" },
  { depth: "WAIST", en: "Waist", pcm: "Waist" },
  { depth: "CAR_ROOF", en: "Car roof", pcm: "Motor roof" },
];

function deviceId() {
  try {
    const existing = window.localStorage.getItem("fp-device");
    if (existing) return existing;
    const created = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem("fp-device", created);
    return created;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/** Shrinks a photo on the phone (about 768 px, JPEG) so it sends fast on slow data. */
async function shrinkPhoto(file: File): Promise<string | null> {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, 768 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return null;
  }
}

function Body() {
  const { lang } = useFp();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [depth, setDepth] = useState<Depth | null>(null);
  const [photo, setPhoto] = useState<{ data: string; takenAt: string; keep?: boolean } | null>(null);
  const [keepPhoto, setKeepPhoto] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    const data = await shrinkPhoto(file);
    setPhotoBusy(false);
    if (!data) { setError("That photo could not be read. You can still send the report without it."); return; }
    // The phone's own time for the file; the Photo check compares it with now.
    setPhoto({ data, takenAt: new Date(file.lastModified || Date.now()).toISOString() });
  }
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  function locate() {
    setLocError(null);
    if (!("geolocation" in navigator)) { setLocError("This device cannot share its location. A location is needed for this report."); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setLocError("Location was not shared. We need it to know where the water is."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function send() {
    if (!coords || !depth) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/floodpass/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: deviceId(), latitude: coords.latitude, longitude: coords.longitude, depth, language: lang, photo: photo ? { ...photo, keep: keepPhoto } : null }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Report failed.");
      setOutcome(json as Outcome);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed.");
    } finally {
      setSending(false);
    }
  }

  if (outcome) {
    const verified = outcome.status === "VERIFIED" && outcome.pass;
    const text = verified
      ? `Your report is verified. Your FloodPass code is ${outcome.pass?.code}.`
      : outcome.status === "LIKELY"
        ? `Thank you. We are checking your report. It has ${outcome.score} of 100 points. When a neighbour confirms it, you will get your FloodPass.`
        : `Thank you. We saved your report. It has ${outcome.score} of 100 points so far. If water is rising, move to high ground now.`;
    return (
      <div className="fp-inner-page fp-stack">
        <div className="fp-page-intro">
          <p className="fp-overline">FLOOD REPORT / RECEIVED</p>
          <h1 className="fp-h1">Your report is in.</h1>
        </div>
        <div className={`fp-status ${verified ? "fp-status-blue" : "fp-status-amber"} fp-stack`} role="status">
          <p style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>{verified ? "Verified" : outcome.status === "LIKELY" ? "Being checked" : "Saved"}</p>
          <p style={{ margin: 0 }}>{text}</p>
          <HearButton text={text} />
        </div>
        {verified ? <Link className="fp-btn fp-btn-primary" href={`/pass/${outcome.pass?.code}`}>Open my FloodPass</Link> : null}
        <details className="fp-card">
          <summary style={{ fontWeight: 800, cursor: "pointer" }}>How we checked it ({outcome.score} of 100)</summary>
          <ul style={{ margin: "12px 0 0", paddingLeft: 20 }} className="fp-stack">
            {outcome.checks.map((check) => (
              <li key={check.key}><strong>{check.label}: {check.points} of {check.max}.</strong> {check.detail}</li>
            ))}
          </ul>
        </details>
        <Link className="fp-btn fp-btn-ghost" href="/">Back home</Link>
      </div>
    );
  }

  const ready = Boolean(coords && depth);
  return (
    <div className="fp-inner-page">
      <div className="fp-page-intro">
        <p className="fp-overline">REPORT WATER / FREE AND OPEN TO EVERYONE</p>
        <h1 className="fp-h1">{lang === "pcm" ? "Water dey here?" : "Water where you are?"}</h1>
        <p>Tell us what you see in three steps. When a report passes the checks, it can receive a FloodPass code.</p>
      </div>
      <div className="fp-page-layout">
      <div className="fp-stack" style={{ gap: 16 }}>
      <section className="fp-card fp-stack" aria-labelledby="fp-step1">
        <h2 id="fp-step1" className="fp-h2 fp-form-step"><span className="fp-step-number">1</span> Where is the water?</h2>
        {coords ? <p style={{ margin: 0 }}>Location found ✔</p> : <p className="fp-muted" style={{ margin: 0 }}>{locError ?? "Share your location so the report can name the right place."}</p>}
        {!coords ? <button className="fp-btn fp-btn-ghost" onClick={locate}>{locError ? "Try again" : "Use my current location"}</button> : null}
      </section>

      <section className="fp-card fp-stack" aria-labelledby="fp-step2">
        <h2 id="fp-step2" className="fp-h2 fp-form-step"><span className="fp-step-number">2</span> How deep?</h2>
        <div className="fp-grid-2">
          {DEPTHS.map((item) => (
            <button key={item.depth} className="fp-depth-btn" aria-pressed={depth === item.depth} onClick={() => setDepth(item.depth)}>
              <DepthIcon depth={item.depth} />
              {lang === "pcm" ? item.pcm : item.en}
            </button>
          ))}
        </div>
      </section>

      <section className="fp-card fp-stack" aria-labelledby="fp-step3">
        <h2 id="fp-step3" className="fp-h2 fp-form-step"><span className="fp-step-number">3</span> Add a photo if you can</h2>
        <label className="fp-btn fp-btn-ghost" style={{ position: "relative" }}>
          {photoBusy ? "Getting photo..." : photo ? "Photo added ✔" : "Take a photo of the water"}
          <input type="file" accept="image/*" capture="environment" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
            onChange={(event) => { void pickPhoto(event.target.files?.[0]); }} />
        </label>
        {photo ? <img src={photo.data} alt="Your flood photo" style={{ width: "100%", borderRadius: 12, maxHeight: 220, objectFit: "cover" }} /> : null}
        {photo ? (
          <label className="fp-row" style={{ alignItems: "flex-start", fontSize: 16 }}>
            <input type="checkbox" checked={keepPhoto} onChange={(e) => setKeepPhoto(e.target.checked)} style={{ width: 22, height: 22, marginTop: 2 }} />
            <span>Keep my photo as private proof. Only organisations checking my FloodPass can see it, for 15 minutes at a time. Deleted after 2 years.</span>
          </label>
        ) : null}
        <p className="fp-muted" style={{ margin: 0, fontSize: 15 }}>A photo can help check a report. If you do not tick the box, we keep a fingerprint of it, not the photo itself.</p>
      </section>

      {error ? <p role="alert" className="fp-status fp-status-red" style={{ margin: 0 }}>{error}</p> : null}
      <button className="fp-btn fp-btn-danger" onClick={send} disabled={!ready || sending}>{sending ? "Sending..." : "Send report"}</button>
      </div>
      <aside className="fp-page-aside">
        <p className="fp-overline">PEOPLE FIRST</p>
        <h2>Stay out of danger.</h2>
        <p>If water is rising around you, move to higher ground before reporting. Call 112 for an emergency.</p>
        <hr style={{ border: 0, borderTop: "1px solid var(--fp-border)", margin: "20px 0" }} />
        <p>Your photo is optional. You can send a report without creating an account.</p>
      </aside>
      </div>
    </div>
  );
}

export default function ReportScreen() {
  return <FpShell active="report"><Body /></FpShell>;
}
