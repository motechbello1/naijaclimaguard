"use client";

import Link from "next/link";
import { useState } from "react";
import FpShell, { HearButton } from "@/components/floodpass/FpShell";

function Body() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [check, setCheck] = useState<{ code: string; placeName: string; state: string | null } | null>(null);

  async function start(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/floodpass/address-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(json.error ?? "Could not start the check."); return; }
    setCheck(json);
  }

  function here() {
    if (!("geolocation" in navigator)) { setError("This phone cannot share its location. Type the area instead."); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => start({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => setError("Location was not shared. Type the area instead."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const intro = "Before you pay rent, buy land or build, see the flood history we know for that spot: verified FloodPasses, known flood spots, floods in the news and blocked drains nearby.";
  return (
    <div className="fp-inner-page fp-stack" style={{ gap: 20 }}>
      <div className="fp-page-intro">
        <p className="fp-overline">RENT & LAND / PLACE HISTORY</p>
        <h1 className="fp-h1">Know the place before you decide.</h1>
        <p>{intro}</p>
        <HearButton text={intro} />
      </div>
      {!check ? (
        <section className="fp-card fp-stack">
          <h2 className="fp-h2">1. Which place?</h2>
          <button className="fp-btn fp-btn-primary" onClick={here} disabled={busy}>I am standing there now</button>
          <p className="fp-muted fp-small" style={{ margin: 0 }}>Or type the area and state:</p>
          <input className="fp-field" placeholder="For example: Lokogoma Abuja" value={text} onChange={(e) => setText(e.target.value)} aria-label="Area and state" />
          <button className="fp-btn fp-btn-ghost" onClick={() => start({ placeText: text })} disabled={busy || text.trim().length < 3}>Use this area</button>
        </section>
      ) : (
        <section className="fp-card fp-stack">
          <h2 className="fp-h2">2. Save this place</h2>
          <p style={{ margin: 0 }}>Place: <strong>{check.placeName}{check.state ? `, ${check.state}` : ""}</strong></p>
          <p style={{ margin: 0 }}>Your check code is <strong>{check.code}</strong>. The paid history report is being prepared and is not on sale yet. Public coverage is available now.</p>
          <Link className="fp-btn fp-btn-primary" href="/floodpass/coverage">Explore public coverage</Link>
          <Link className="fp-btn fp-btn-ghost" href="/floodpass/plans">See the launch plan</Link>
          <button className="fp-btn fp-btn-ghost" onClick={() => setCheck(null)}>Pick another place</button>
        </section>
      )}
      {error ? <p role="alert" className="fp-status fp-status-amber" style={{ margin: 0 }}>{error}</p> : null}
      <p className="fp-muted fp-small" style={{ margin: 0 }}>This is history we know about, not a promise. "No floods found" can also mean nobody has reported there yet.</p>
    </div>
  );
}

export default function AddressCheckScreen() {
  return <FpShell active="plans"><Body /></FpShell>;
}
