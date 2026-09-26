"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import FpShell, { HearButton, useFp } from "@/components/floodpass/FpShell";

type CheckResult =
  | { found: false; code: string; error?: string }
  | { found: true; code: string; pass: { code: string; status: string; placeName: string; state: string | null; floodedAt: string; depthWords: string; checksPassed: number; checksTotal: number; seeded: boolean }; partnerView?: Record<string, unknown> };

function Body() {
  const params = useSearchParams();
  const { tr } = useFp();
  const [code, setCode] = useState(params.get("code")?.toUpperCase() ?? "");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(value: string) {
    if (!value.trim()) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const response = await fetch(`/api/floodpass/check/${encodeURIComponent(value.trim())}`, { cache: "no-store" });
      const json = (await response.json()) as CheckResult & { error?: string };
      if (response.status === 503 || response.status === 500) throw new Error(json.error || "Check is not available right now.");
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed.");
    } finally { setBusy(false); }
  }

  useEffect(() => { const initial = params.get("code"); if (initial) void run(initial); }, [params]);

  const spoken = result?.found
    ? `FloodPass ${result.pass.code} is ${result.pass.seeded ? "a reconstructed demo" : result.pass.status === "VERIFIED" ? "verified" : "cancelled"}. ${result.pass.placeName}. Water ${result.pass.depthWords}.`
    : result ? `We found no FloodPass with that code.` : "";

  return (
    <div className="fp-inner-page">
      <div className="fp-page-intro">
        <p className="fp-overline">THE FLOOD RECORD / OPEN CHECK</p>
        <h1 className="fp-h1">Check the proof.</h1>
        <p>Enter a FloodPass code to see its place, date and status. Anyone can check a code for free.</p>
      </div>
      <div className="fp-page-layout">
      <div className="fp-stack" style={{ gap: 20 }}>
      <form className="fp-card fp-stack" onSubmit={(event) => { event.preventDefault(); void run(code); }}>
        <label htmlFor="fp-code" style={{ fontWeight: 800 }}>{tr("checkCode")}</label>
        <input id="fp-code" className="fp-input" placeholder="FP-ABJ-7K2Q" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" />
        <button className="fp-btn fp-btn-primary" type="submit" disabled={busy}>{busy ? "Checking..." : "Check"}</button>
      </form>
      {error ? <p role="alert" className="fp-status fp-status-red" style={{ margin: 0 }}>{error}</p> : null}
      {result ? (
        result.found ? (
          <div className={`fp-status ${result.pass.status === "VERIFIED" ? "fp-status-blue" : "fp-status-red"} fp-stack`} role="status">
            <p style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>{result.pass.seeded ? "Reconstructed demo record" : result.pass.status === "VERIFIED" ? "✔ Verified" : "Cancelled: not valid"}</p>
            <p style={{ margin: 0 }}><strong>{result.pass.placeName}{result.pass.state ? `, ${result.pass.state}` : ""}</strong></p>
            <p style={{ margin: 0 }}>{new Date(result.pass.floodedAt).toLocaleString("en-NG", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" })} · water {result.pass.depthWords}</p>
            <p style={{ margin: 0, fontSize: 15 }}>Checks passed: {result.pass.checksPassed} of {result.pass.checksTotal}{result.pass.seeded ? " · rebuilt from news, not a person's report" : ""}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <HearButton text={spoken} />
              <Link className="fp-chip" href={`/pass/${result.pass.code}`}>Open the card</Link>
            </div>
          </div>
        ) : (
          <div className="fp-status fp-status-amber fp-stack" role="status">
            <p style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Not found</p>
            <p style={{ margin: 0 }}>{result.error ?? `We found no FloodPass with the code ${result.code}. Check each letter and try again.`}</p>
          </div>
        )
      ) : null}
      </div>
      <aside className="fp-page-aside">
        <p className="fp-overline">WHAT THE CHECK MEANS</p>
        <h2>A code is a starting point.</h2>
        <p>Read the place, time, depth, checks and any demo label. A code does not promise payment or prove the value of a loss.</p>
        <Link className="fp-link" href="/partners">Checking for an organisation?</Link>
      </aside>
      </div>
    </div>
  );
}

export default function CheckScreen() {
  return <FpShell active="check"><Body /></FpShell>;
}
