"use client";

import { useEffect, useMemo, useState } from "react";
import FpShell, { HearButton } from "@/components/floodpass/FpShell";
import type { CoverageReport } from "@/lib/floodpass/coverage";

function ago(iso: string | null) {
  if (!iso) return "not yet";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function Body() {
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/floodpass/coverage")
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Not available.");
        setReport(json as CoverageReport);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Not available."));
  }, []);

  const states = useMemo(() => {
    const rows = report?.states ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q ? rows.filter((row) => row.state.toLowerCase().includes(q) || row.capital.toLowerCase().includes(q)) : rows;
    // Busiest first: warnings, then floods in the news, then flagged rain.
    return [...filtered].sort((a, b) => b.warnings14d - a.warnings14d || b.newsFloods90d - a.newsFloods90d || b.lgasFlaggedToday - a.lgasFlaggedToday || a.state.localeCompare(b.state));
  }, [report, query]);

  const intro = "FloodPass watches all 36 states and the FCT. Every 15 minutes we check the rain in every local government area and read the flood news. Anyone in any state can report a flood and get a FloodPass.";

  return (
    <div className="fp-inner-page fp-stack" style={{ gap: 20, maxWidth: 1080 }}>
      <div className="fp-page-intro">
        <p className="fp-overline">COVERAGE / NIGERIA</p>
        <h1 className="fp-h1">See the coverage.</h1>
        <p>{intro}</p>
        <HearButton text={intro} />
      </div>

      {report ? (
        <div className="fp-grid-2">
          <div className="fp-card"><p style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>36 + FCT</p><p className="fp-muted" style={{ margin: 0 }}>all states covered</p></div>
          <div className="fp-card"><p style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>{report.lgasWatched || "774"}</p><p className="fp-muted" style={{ margin: 0 }}>local governments</p></div>
          <div className="fp-card"><p style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>{report.states.reduce((sum, row) => sum + row.newsFloods90d, 0)}</p><p className="fp-muted" style={{ margin: 0 }}>floods in the news, 90 days</p></div>
          <div className="fp-card"><p style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{ago(report.lastRainScanAt)}</p><p className="fp-muted" style={{ margin: 0 }}>last rain check</p></div>
        </div>
      ) : error ? (
        <p className="fp-status fp-status-amber" style={{ margin: 0 }}>Coverage numbers are not available right now. {error}</p>
      ) : (
        <p className="fp-muted" style={{ margin: 0 }}>Loading...</p>
      )}

      <label className="fp-stack" style={{ gap: 6 }}>
        <span style={{ fontWeight: 800 }}>Find your state</span>
        <input className="fp-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="For example Lagos or Makurdi" />
      </label>

      <ul className="fp-stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {states.map((row) => {
          const tone = row.warnings14d > 0 ? "fp-status-red" : row.newsFloods90d > 0 || row.lgasFlaggedToday > 0 ? "fp-status-amber" : "fp-status-blue";
          const label = row.warnings14d > 0 ? "Warning in the news" : row.newsFloods90d > 0 ? "Recent floods" : row.lgasFlaggedToday > 0 ? "Heavy rain flagged" : "Watching";
          return (
            <li key={row.state} className="fp-card fp-stack" style={{ gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <h2 className="fp-h2" style={{ fontSize: 21 }}>{row.state === "FCT" ? "FCT (Abuja)" : row.state}</h2>
                <span className={`fp-chip ${tone}`} style={{ border: 0 }}>{label}</span>
              </div>
              <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", margin: 0, fontSize: 15 }}>
                {[
                  ["Areas watched", row.lgasWatched],
                  ["Heavy rain today", row.lgasFlaggedToday],
                  ["Floods in news, 90 days", row.newsFloods90d],
                  ["Warnings, 14 days", row.warnings14d],
                  ["FloodPasses", row.floodPasses],
                  ["People on WhatsApp", row.people],
                ].map(([name, value]) => (
                  <div key={String(name)} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <dt className="fp-muted">{name}</dt>
                    <dd style={{ margin: 0, fontWeight: 800 }}>{value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>

      {report ? (
        <section className="fp-card fp-stack">
          <h2 className="fp-h2">Where our data comes from</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }} className="fp-stack">
            {report.sources.map((source) => (
              <li key={source.name}><strong>{source.name}</strong> ({source.status}): {source.what}. {source.howOften}.</li>
            ))}
          </ul>
          <p className="fp-muted" style={{ margin: 0, fontSize: 15 }}>FloodPass never says a place is safe. Official warnings from NiMet, NIHSA and NEMA always come first.</p>
        </section>
      ) : null}
    </div>
  );
}

export default function CoverageScreen() {
  return <FpShell active="home"><Body /></FpShell>;
}
