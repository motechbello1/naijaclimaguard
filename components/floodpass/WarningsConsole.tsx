"use client";

import { useCallback, useEffect, useState } from "react";

type Warning = {
  id: string; status: string; level: string; hazard: string; placeLabel: string; window: string; source: string; sourceUrl: string | null;
  action: string; avoid: string | null; areaType: string; latitude: number | null; longitude: number | null; radiusKm: number | null; state: string | null;
  createdBy: string; recipients: number; sent: number; failed: number; createdAt: string; approvedAt: string | null; finishedAt: string | null;
};

type Preview = {
  warning: Warning; recipients: number; byChannel: Record<string, number>; byLanguage: Record<string, number>;
  messages: { en: { message: string; writtenBy: string }; pcm: { message: string; writtenBy: string } };
  deliveries: Array<{ channel: string; status: string; count: number }>;
};

const STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];

const EMPTY = { level: "BE_CAREFUL", hazard: "", placeLabel: "", window: "", source: "NiMet", sourceUrl: "", action: "", avoid: "", areaType: "RADIUS", latitude: "", longitude: "", radiusKm: "3", states: [] as string[], expiresInHours: "24" };

function tone(status: string) {
  if (status === "SENDING") return "fp-status-amber";
  if (status === "SENT") return "fp-status-blue";
  if (status === "CANCELLED") return "";
  return "fp-status-amber";
}

export default function WarningsConsole() {
  const [list, setList] = useState<Warning[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/floodpass/warnings", { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) { setError(json.error ?? "Could not load warnings."); setList([]); return; }
    setError(null);
    setList(json.warnings as Warning[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const set = (key: keyof typeof EMPTY, value: string | string[]) => setForm((f) => ({ ...f, [key]: value }));

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition((p) => setForm((f) => ({ ...f, latitude: p.coords.latitude.toFixed(5), longitude: p.coords.longitude.toFixed(5) })));
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/floodpass/warnings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(json.error ?? "Could not save."); return; }
    setForm(EMPTY);
    await load();
    await open(json.warning.id);
  }

  async function open(id: string) {
    setPreview(null);
    const response = await fetch(`/api/floodpass/warnings/${id}`, { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) { setError(json.error ?? "Could not open."); return; }
    setPreview(json as Preview);
  }

  async function act(id: string, action: "approve" | "send_batch" | "cancel") {
    if (action === "approve" && !window.confirm("Send this warning to everyone in the area now?")) return;
    setBusy(true);
    const response = await fetch(`/api/floodpass/warnings/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const json = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) setError(json.error ?? "Action failed.");
    await load();
    await open(id);
  }

  return (
    <div className="fp-stack">
      <p style={{ margin: 0 }}>Only official warnings go out. Name the agency and link to its notice. You check the words and the number of people before anything is sent.</p>
      {error ? <p role="alert" className="fp-status fp-status-red" style={{ margin: 0 }}>{error}</p> : null}

      {preview ? (
        <section className="fp-card fp-stack" aria-live="polite">
          <div className="fp-row" style={{ justifyContent: "space-between" }}>
            <h3 className="fp-h2" style={{ fontSize: 20 }}>{preview.warning.hazard}: {preview.warning.placeLabel}</h3>
            <span className={`fp-chip ${tone(preview.warning.status)}`} style={{ border: 0 }}>{preview.warning.status}</span>
          </div>
          <dl className="fp-kv">
            <dt>People</dt><dd>{preview.recipients}</dd>
            <dt>By channel</dt><dd>{Object.entries(preview.byChannel).map(([k, v]) => `${k} ${v}`).join(", ") || "none yet"}</dd>
            <dt>By language</dt><dd>{Object.entries(preview.byLanguage).map(([k, v]) => `${k === "pcm" ? "Pidgin" : "English"} ${v}`).join(", ") || "none yet"}</dd>
            <dt>Source</dt><dd>{preview.warning.source}{preview.warning.sourceUrl ? <> · <a className="fp-link" href={preview.warning.sourceUrl} target="_blank" rel="noreferrer">notice</a></> : null}</dd>
            <dt>Sent so far</dt><dd>{preview.warning.sent} sent, {preview.warning.failed} failed</dd>
          </dl>
          {(["en", "pcm"] as const).map((lang) => (
            <div key={lang}>
              <p className="fp-small fp-muted" style={{ margin: "0 0 6px" }}>{lang === "en" ? "English" : "Pidgin"} ({preview.messages[lang].writtenBy === "ai" ? "written by AI, checked by rules" : "fixed template"})</p>
              <p className="fp-bubble fp-bubble-in" style={{ margin: 0, maxWidth: "100%" }}>{preview.messages[lang].message}</p>
            </div>
          ))}
          <div className="fp-row">
            {preview.warning.status === "DRAFT" ? <button className="fp-btn fp-btn-danger fp-btn-sm" disabled={busy} onClick={() => act(preview.warning.id, "approve")}>Approve and send</button> : null}
            {preview.warning.status === "SENDING" ? <button className="fp-btn fp-btn-primary fp-btn-sm" disabled={busy} onClick={() => act(preview.warning.id, "send_batch")}>Send next batch</button> : null}
            {preview.warning.status === "DRAFT" || preview.warning.status === "SENDING" ? <button className="fp-btn fp-btn-ghost fp-btn-sm" disabled={busy} onClick={() => act(preview.warning.id, "cancel")}>Cancel</button> : null}
            <button className="fp-btn fp-btn-ghost fp-btn-sm" onClick={() => setPreview(null)}>Close</button>
          </div>
        </section>
      ) : null}

      <section className="fp-stack">
        <h3 className="fp-h2" style={{ fontSize: 20 }}>Warnings</h3>
        {list === null ? <p className="fp-muted" style={{ margin: 0 }}>Loading...</p> : list.length === 0 ? <p className="fp-muted" style={{ margin: 0 }}>No warnings yet. Drafts appear here automatically when NiMet, NIHSA or NEMA warnings show up in the news.</p> : (
          <ul className="fp-list">
            {list.map((w) => (
              <li key={w.id}>
                <button className="fp-card" style={{ width: "100%", textAlign: "left", cursor: "pointer", color: "var(--fp-text)" }} onClick={() => open(w.id)}>
                  <span className="fp-row" style={{ justifyContent: "space-between" }}>
                    <strong>{w.hazard}: {w.placeLabel}</strong>
                    <span className={`fp-chip ${tone(w.status)}`} style={{ border: 0 }}>{w.status}{w.createdBy === "auto-news" ? " · from news" : ""}</span>
                  </span>
                  <span className="fp-small fp-muted">{w.source} · {new Date(w.createdAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} · {w.sent} sent</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form className="fp-card fp-stack" onSubmit={create}>
        <h3 className="fp-h2" style={{ fontSize: 20 }}>New warning</h3>
        <div className="fp-row">
          {(["BE_CAREFUL", "DANGER"] as const).map((level) => (
            <button type="button" key={level} className="fp-chip" aria-pressed={form.level === level} onClick={() => set("level", level)}
              style={form.level === level ? { background: level === "DANGER" ? "var(--fp-red-solid)" : "var(--fp-amber-bg)", color: level === "DANGER" ? "#fff" : "var(--fp-amber-text)" } : undefined}>
              {level === "DANGER" ? "Danger" : "Be careful"}
            </button>
          ))}
        </div>
        <label><span className="fp-label">Danger</span><input className="fp-field" value={form.hazard} onChange={(e) => set("hazard", e.target.value)} placeholder="Heavy rain and flash floods" /></label>
        <label><span className="fp-label">Where (words people know)</span><input className="fp-field" value={form.placeLabel} onChange={(e) => set("placeLabel", e.target.value)} placeholder="Gudu, Apo and Lokogoma" /></label>
        <label><span className="fp-label">When</span><input className="fp-field" value={form.window} onChange={(e) => set("window", e.target.value)} placeholder="from 4pm to 9pm today" /></label>
        <label><span className="fp-label">What to do</span><textarea className="fp-field" value={form.action} onChange={(e) => set("action", e.target.value)} placeholder="Move cars and valuables to high ground before 4pm." /></label>
        <label><span className="fp-label">Road or place to avoid (optional)</span><input className="fp-field" value={form.avoid} onChange={(e) => set("avoid", e.target.value)} placeholder="the Gaduwa-Durumi bridge" /></label>
        <label><span className="fp-label">Official source</span>
          <select className="fp-field" value={form.source} onChange={(e) => set("source", e.target.value)}>
            {["NiMet", "NIHSA", "NEMA", "FEMA Abuja", "LASEMA", "State emergency agency"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label><span className="fp-label">Link to the official notice</span><input className="fp-field" value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://nimet.gov.ng/..." /></label>
        <div className="fp-row">
          {(["RADIUS", "STATE"] as const).map((kind) => (
            <button type="button" key={kind} className="fp-chip" aria-pressed={form.areaType === kind} onClick={() => set("areaType", kind)}
              style={form.areaType === kind ? { background: "var(--fp-brand)", color: "var(--fp-brand-text)" } : undefined}>
              {kind === "RADIUS" ? "Area around a point" : "Whole states"}
            </button>
          ))}
        </div>
        {form.areaType === "RADIUS" ? (
          <div className="fp-stack">
            <div className="fp-grid-2">
              <label><span className="fp-label">Latitude</span><input className="fp-field" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} inputMode="decimal" placeholder="9.006" /></label>
              <label><span className="fp-label">Longitude</span><input className="fp-field" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} inputMode="decimal" placeholder="7.475" /></label>
            </div>
            <div className="fp-grid-2">
              <label><span className="fp-label">Distance (km)</span><input className="fp-field" value={form.radiusKm} onChange={(e) => set("radiusKm", e.target.value)} inputMode="decimal" /></label>
              <button type="button" className="fp-btn fp-btn-ghost" style={{ alignSelf: "end", minHeight: 48 }} onClick={useMyLocation}>Use my location</button>
            </div>
          </div>
        ) : (
          <div className="fp-row">
            {STATES.map((s) => (
              <label key={s} className="fp-chip" style={form.states.includes(s) ? { background: "var(--fp-brand)", color: "var(--fp-brand-text)" } : undefined}>
                <input type="checkbox" checked={form.states.includes(s)} onChange={(e) => set("states", e.target.checked ? [...form.states, s] : form.states.filter((x) => x !== s))} style={{ width: 16, height: 16 }} />
                {s}
              </label>
            ))}
          </div>
        )}
        <label><span className="fp-label">Stop sending after (hours)</span><input className="fp-field" value={form.expiresInHours} onChange={(e) => set("expiresInHours", e.target.value)} inputMode="numeric" /></label>
        <button className="fp-btn fp-btn-primary" type="submit" disabled={busy}>{busy ? "Saving..." : "Save as draft and preview"}</button>
      </form>
    </div>
  );
}
