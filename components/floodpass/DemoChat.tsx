"use client";

import { useState } from "react";
import FpShell from "@/components/floodpass/FpShell";
import { ABUJA_HOTSPOTS } from "@/lib/floodpass/hotspots";

type Line = { from: "me" | "fp"; text: string };

/**
 * On-stage backup for the WhatsApp demo. Runs the exact same conversation as
 * the real WhatsApp number, through /api/channels/simulate (founder only).
 */
function Body() {
  const [who, setWho] = useState("judge-1");
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const gudu = ABUJA_HOTSPOTS.find((spot) => spot.id === "abj-gudu-ebeano");

  async function send(body: Record<string, unknown>, shown: string) {
    setBusy(true);
    setLines((current) => [...current, { from: "me", text: shown }]);
    try {
      const response = await fetch("/api/channels/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: who, ...body }) });
      const json = await response.json();
      const replies: string[] = response.ok ? json.replies : [json.error ?? "Error"];
      setLines((current) => [...current, ...replies.map((reply) => ({ from: "fp" as const, text: reply }))]);
    } catch {
      setLines((current) => [...current, { from: "fp", text: "Network error." }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="fp-stack" style={{ gap: 16 }}>
      <h1 className="fp-h1">WhatsApp demo</h1>
      <p className="fp-muted" style={{ margin: 0 }}>Founder only. Same conversation as the real WhatsApp number. Use a different name for each person on stage so the neighbour check can work.</p>
      <label style={{ fontWeight: 800 }} htmlFor="fp-who">Person</label>
      <input id="fp-who" className="fp-input" style={{ fontSize: 16, letterSpacing: 0 }} value={who} onChange={(e) => setWho(e.target.value)} />
      <div className="fp-card" style={{ minHeight: 280, display: "flex", flexDirection: "column", gap: 10 }} aria-live="polite">
        {lines.length === 0 ? <p className="fp-muted" style={{ margin: 0 }}>Say Hi to start.</p> : null}
        {lines.map((line, index) => <div key={index} className={`fp-bubble ${line.from === "me" ? "fp-bubble-out" : "fp-bubble-in"}`}>{line.text}</div>)}
      </div>
      <form className="fp-stack" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { void send({ kind: "text", text }, text); setText(""); } }}>
        <input className="fp-input" style={{ fontSize: 16, letterSpacing: 0 }} placeholder="Type a message" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="fp-grid-2">
          <button className="fp-btn fp-btn-primary" type="submit" disabled={busy}>Send</button>
          <button className="fp-btn fp-btn-ghost" type="button" disabled={busy || !gudu} onClick={() => gudu && send({ kind: "location", latitude: gudu.latitude, longitude: gudu.longitude, name: `${gudu.name}, ${gudu.area}` }, "[location pin: Gudu]")}>Send Gudu pin</button>
          <button className="fp-btn fp-btn-ghost" type="button" disabled={busy} onClick={() => send({ kind: "image" }, "[photo of water]")}>Send photo</button>
          <button className="fp-btn fp-btn-ghost" type="button" disabled={busy} onClick={() => setLines([])}>Clear screen</button>
        </div>
      </form>
    </div>
  );
}

export default function DemoChat() {
  return <FpShell><Body /></FpShell>;
}
