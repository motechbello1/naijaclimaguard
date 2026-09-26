"use client";

import { useEffect, useState } from "react";
import FpShell, { HearButton, useFp, whatsappLink } from "@/components/floodpass/FpShell";

type Board = {
  counts: { blocked: number; cleaned: number; verified: number };
  leaders: Array<{ hero: string; points: number }>;
  recent: Array<{ code: string; placeName: string; state: string | null; status: string; reportedAt: string; confirmations: number }>;
  reward: { pointsPerUnit: number; nairaPerUnit: number; maxNairaPer30Days: number };
  error?: string;
};

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

async function shrink(file: File) {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => { const el = new Image(); el.onload = () => resolve(el); el.onerror = reject; el.src = url; });
  const scale = Math.min(1, 768 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas.toDataURL("image/jpeg", 0.72);
}

const STATUS_WORDS: Record<string, string> = { BLOCKED: "Blocked", CLEANED: "Cleaned, waiting for neighbours", VERIFIED: "Verified clean", REJECTED: "Rejected" };

function Body() {
  const { lang } = useFp();
  const [board, setBoard] = useState<Board | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/floodpass/drains").then((r) => r.json()).then(setBoard).catch(() => setBoard(null));
  }, []);

  function send() {
    if (!photo) return;
    setBusy(true);
    setNote(null);
    navigator.geolocation?.getCurrentPosition(
      async (p) => {
        const response = await fetch("/api/floodpass/drains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId: deviceId(), latitude: p.coords.latitude, longitude: p.coords.longitude, photo }) });
        const json = await response.json().catch(() => ({}));
        setBusy(false);
        if (!response.ok) { setNote(json.error ?? "Could not save."); return; }
        setPhoto(null);
        setNote(`${json.existing ? "This drain is already on the map" : "Saved"}: drain ${json.code} at ${json.placeName}. When it is cleaned, the cleaner sends CLEANED ${json.code} with a photo on WhatsApp.`);
      },
      () => { setBusy(false); setNote("Location was not shared. We need it to find the drain."); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const intro = lang === "pcm"
    ? "Gutter wey block dey cause flood for our streets. Drain Heroes dey pay people with points and airtime to clear am. Snap the gutter, clean am, make two neighbours confirm, collect your points."
    : "Blocked drains flood our streets. Drain Heroes rewards people with points and airtime for clearing them. Photo the drain, clean it, two neighbours confirm, and you earn points.";
  const wa = whatsappLink("DRAIN");

  return (
    <div className="fp-inner-page fp-stack" style={{ gap: 20 }}>
      <div className="fp-page-intro">
        <p className="fp-overline">COMMUNITY ACTION / DRAIN HEROES</p>
        <h1 className="fp-h1">Clear the way for water.</h1>
        <p>{intro}</p>
        <HearButton text={intro} />
      </div>

      {board && !board.error ? (
        <div className="fp-grid-2">
          <div className="fp-card"><p style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>{board.counts.blocked}</p><p className="fp-muted fp-small" style={{ margin: 0 }}>blocked drains reported</p></div>
          <div className="fp-card"><p style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>{board.counts.verified}</p><p className="fp-muted fp-small" style={{ margin: 0 }}>verified clean</p></div>
        </div>
      ) : null}

      <section className="fp-card fp-stack">
        <h2 className="fp-h2">How it works</h2>
        <ol style={{ margin: 0, paddingLeft: 22 }} className="fp-stack">
          <li>Send DRAIN on WhatsApp with a photo of the blocked drain. You get a code like D-7K2Q.</li>
          <li>Clean it (alone or with neighbours). Send CLEANED D-7K2Q with a photo after.</li>
          <li>Two neighbours send CONFIRM D-7K2Q by WhatsApp, SMS or USSD. Each gets 2 points.</li>
          <li>Verified: the cleaner gets 50 points, the reporter 5. Send REWARD for airtime.</li>
        </ol>
        {board ? <p className="fp-small fp-muted" style={{ margin: 0 }}>{board.reward.pointsPerUnit} points = N{board.reward.nairaPerUnit} airtime, up to N{board.reward.maxNairaPer30Days} a month. Airtime is paid by sponsors and checked by a person first.</p> : null}
        {wa ? <a className="fp-btn fp-btn-primary" href={wa}>Start on WhatsApp</a> : null}
      </section>

      <section className="fp-card fp-stack">
        <h2 className="fp-h2">Report a blocked drain here</h2>
        <label className="fp-btn fp-btn-ghost" style={{ position: "relative" }}>
          {photo ? "Photo added ✔" : "Take a photo of the drain"}
          <input type="file" accept="image/*" capture="environment" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
            onChange={async (e) => { const file = e.target.files?.[0]; if (file) setPhoto(await shrink(file).catch(() => null)); }} />
        </label>
        <button className="fp-btn fp-btn-danger" onClick={send} disabled={!photo || busy}>{busy ? "Saving..." : "Send drain report"}</button>
        {note ? <p role="status" style={{ margin: 0 }}>{note}</p> : null}
        <p className="fp-small fp-muted" style={{ margin: 0 }}>Points for cleaning and airtime work on WhatsApp, SMS and USSD, where each person is a real phone number.</p>
      </section>

      {board?.leaders?.length ? (
        <section className="fp-card fp-stack">
          <h2 className="fp-h2">Top heroes (90 days)</h2>
          <ol style={{ margin: 0, paddingLeft: 22 }}>{board.leaders.map((l) => <li key={l.hero}><strong>{l.hero}</strong>: {l.points} points</li>)}</ol>
        </section>
      ) : null}

      {board?.recent?.length ? (
        <section className="fp-card fp-stack">
          <h2 className="fp-h2">Recent drains</h2>
          <ul className="fp-list">
            {board.recent.map((d) => <li key={d.code}><strong>{d.code}</strong> {d.placeName}{d.state ? `, ${d.state}` : ""}: {STATUS_WORDS[d.status] ?? d.status}</li>)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function DrainHeroesScreen() {
  return <FpShell><Body /></FpShell>;
}
