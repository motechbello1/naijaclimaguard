"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FpShell from "@/components/floodpass/FpShell";

type PartnerCheck = {
  found: boolean;
  code: string;
  error?: string;
  pass?: { status: string; placeName: string; state: string | null; floodedAt: string; depthWords: string; checksPassed: number; checksTotal: number; seeded: boolean; sequence: number };
  partnerView?: { latitude: number; longitude: number; score: number; engineVersion: string; hash: string; previousHash: string; partner: string; revokedReason: string | null; checks: Array<{ label: string; points: number; max: number; detail: string }>; photoLinks?: string[] };
};

type RecordCheck = { intact: boolean; total: number; brokenAtSequence: number | null; reason: string | null; latestHash: string; checkedAt: string; error?: string };

function Body() {
  const [key, setKey] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<PartnerCheck | null>(null);
  const [record, setRecord] = useState<RecordCheck | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { setKey(window.sessionStorage.getItem("fp-partner-key") ?? ""); } catch { /* ignore */ }
    fetch("/api/floodpass/record", { cache: "no-store" }).then((r) => r.json()).then(setRecord).catch(() => setRecord(null));
  }, []);

  async function check(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try { window.sessionStorage.setItem("fp-partner-key", key); } catch { /* ignore */ }
    try {
      const response = await fetch(`/api/floodpass/check/${encodeURIComponent(code.trim())}`, { headers: key ? { "x-floodpass-key": key } : {}, cache: "no-store" });
      setResult((await response.json()) as PartnerCheck);
    } catch {
      setResult({ found: false, code, error: "Check failed. Try again." });
    } finally { setBusy(false); }
  }

  return (
    <div className="fp-inner-page fp-stack" style={{ gap: 20 }}>
      <div className="fp-page-intro">
        <p className="fp-overline">PARTNERS / EVIDENCE CHECK</p>
        <h1 className="fp-h1">Check the record. See the evidence.</h1>
        <p>For organisations checking a FloodPass before deciding how to help. Read the place, time, status and supporting checks.</p>
      </div>

      <form className="fp-card fp-stack" onSubmit={check}>
        <h2 className="fp-h2">Check a FloodPass</h2>
        <label htmlFor="fp-p-code" style={{ fontWeight: 800 }}>Code</label>
        <input id="fp-p-code" className="fp-input" placeholder="FP-ABJ-7K2Q" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" />
        <label htmlFor="fp-p-key" style={{ fontWeight: 800 }}>Partner key (optional)</label>
        <input id="fp-p-key" className="fp-input" style={{ fontSize: 16, letterSpacing: 0 }} type="password" placeholder="fpk_..." value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
        <button className="fp-btn fp-btn-primary" type="submit" disabled={busy}>{busy ? "Checking..." : "Check"}</button>
        <p className="fp-muted" style={{ margin: 0, fontSize: 15 }}>With a partner key you see the full evidence and the record fingerprint, and each check is logged for your monthly bill.</p>
      </form>

      {result ? (
        <section className="fp-card fp-stack" aria-live="polite">
          {result.found && result.pass ? (
            <>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{result.pass.status === "VERIFIED" ? "✔ Verified" : "Cancelled"}: {result.code}</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16 }}>
                <tbody>
                  <tr><th style={{ textAlign: "left", padding: "6px 8px 6px 0" }}>Place</th><td>{result.pass.placeName}{result.pass.state ? `, ${result.pass.state}` : ""}</td></tr>
                  <tr><th style={{ textAlign: "left", padding: "6px 8px 6px 0" }}>Flood time</th><td>{new Date(result.pass.floodedAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</td></tr>
                  <tr><th style={{ textAlign: "left", padding: "6px 8px 6px 0" }}>Depth</th><td>{result.pass.depthWords}</td></tr>
                  <tr><th style={{ textAlign: "left", padding: "6px 8px 6px 0" }}>Checks</th><td>{result.pass.checksPassed} of {result.pass.checksTotal}</td></tr>
                  <tr><th style={{ textAlign: "left", padding: "6px 8px 6px 0" }}>Record page</th><td>{result.pass.sequence}</td></tr>
                  {result.pass.seeded ? <tr><th style={{ textAlign: "left", padding: "6px 8px 6px 0" }}>Note</th><td>Demo record rebuilt from news</td></tr> : null}
                  {result.partnerView ? (
                    <>
                      <tr><th style={{ textAlign: "left", padding: "6px 8px 6px 0" }}>Score</th><td>{result.partnerView.score} of 100 ({result.partnerView.engineVersion})</td></tr>
                      <tr><th style={{ textAlign: "left", padding: "6px 8px 6px 0" }}>Point</th><td>{result.partnerView.latitude.toFixed(5)}, {result.partnerView.longitude.toFixed(5)}</td></tr>
                      <tr><th style={{ textAlign: "left", padding: "6px 8px 6px 0" }}>Fingerprint</th><td style={{ wordBreak: "break-all", fontFamily: "monospace", fontSize: 13 }}>{result.partnerView.hash}</td></tr>
                    </>
                  ) : null}
                </tbody>
              </table>
              {result.partnerView?.photoLinks?.length ? (
                <div className="fp-row">
                  {result.partnerView.photoLinks.map((link, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={link} href={link} target="_blank" rel="noreferrer"><img src={link} alt={`Flood photo ${i + 1}`} style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 12 }} /></a>
                  ))}
                  <p className="fp-small fp-muted" style={{ margin: 0 }}>Private proof photos. Links stop working after 15 minutes.</p>
                </div>
              ) : null}
              {result.partnerView?.checks?.length ? (
                <ul style={{ margin: 0, paddingLeft: 20 }}>{result.partnerView.checks.map((c) => <li key={c.label}><strong>{c.label} {c.points}/{c.max}:</strong> {c.detail}</li>)}</ul>
              ) : null}
            </>
          ) : (
            <p style={{ margin: 0 }}>{result.error ?? `No FloodPass found for ${result.code}.`}</p>
          )}
        </section>
      ) : null}

      <section className="fp-card fp-stack">
        <h2 className="fp-h2">Is the Flood Record untouched?</h2>
        {record && !record.error ? (
          <p style={{ margin: 0 }}>{record.intact ? `✔ Yes. All ${record.total} pages re-checked just now; every fingerprint matches.` : `✘ No. ${record.reason}`}</p>
        ) : (
          <p className="fp-muted" style={{ margin: 0 }}>The record check is not available yet.</p>
        )}
      </section>

      <section className="fp-card fp-stack">
        <h2 className="fp-h2">Connect your system</h2>
        <p style={{ margin: 0 }}>Call <code>GET /api/floodpass/check/&#123;code&#125;</code> with the header <code>x-floodpass-key</code>. The answer is JSON. Each successful check is billed at your agreed price.</p>
        <Link className="fp-btn fp-btn-ghost" href="/contact">Become a partner</Link>
      </section>
    </div>
  );
}

export default function PartnerScreen() {
  return <FpShell active="partners"><Body /></FpShell>;
}
