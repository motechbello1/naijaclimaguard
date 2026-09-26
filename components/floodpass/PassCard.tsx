"use client";

import { useState } from "react";
import { ArrowUpRight, Download, Share2 } from "lucide-react";
import DepthIcon from "@/components/floodpass/DepthIcon";
import { FpMark } from "@/components/floodpass/FpShell";
import type { PublicPass } from "@/lib/floodpass/service";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });
}

export default function PassCard({ pass, qrSvg, checkUrl, wallets }: { pass: PublicPass; qrSvg?: string | null; checkUrl: string; wallets?: { google: boolean; apple: boolean } }) {
  const [shared, setShared] = useState<string | null>(null);
  const valid = pass.status === "VERIFIED";

  async function share() {
    const text = `FloodPass ${pass.code}: ${pass.placeName}, ${when(pass.floodedAt)}. Check its current status: ${checkUrl}`;
    try {
      if (navigator.share) { await navigator.share({ title: `FloodPass ${pass.code}`, text, url: checkUrl }); setShared("Shared."); return; }
      await navigator.clipboard.writeText(text);
      setShared("Copied. Paste it into WhatsApp or an email.");
    } catch { setShared(null); }
  }

  return (
    <article className="fp-pass" data-demo={pass.seeded ? "true" : undefined} aria-label={`FloodPass ${pass.code}${pass.seeded ? ", reconstructed demo" : ""}`}>
      <div className="fp-pass-top">
        <div className="fp-pass-brand"><FpMark size={34} /><div><strong>FloodPass</strong><small>BY NAIJACLIMAGUARD</small></div></div>
        <span className="fp-pass-status">{pass.seeded ? "RECONSTRUCTED DEMO" : valid ? "VERIFIED REPORT" : "CANCELLED RECORD"}</span>
      </div>
      <div className="fp-pass-body">
        <div className="fp-pass-data">
          <p className="fp-pass-label">01 / PLACE RECORDED</p>
          <h2>{pass.placeName}{pass.state ? `, ${pass.state}` : ""}</h2>
          <div className="fp-pass-facts">
            <div><p className="fp-pass-label">02 / WHEN</p><strong>{when(pass.floodedAt)}</strong></div>
            <div className="fp-pass-depth"><p className="fp-pass-label">03 / WATER LEVEL</p><span><DepthIcon depth={pass.depth} size={44} /> <strong>{pass.depthWords}</strong></span></div>
          </div>
          <div className="fp-pass-code-block"><p className="fp-pass-label">FLOODPASS CODE</p><strong className="fp-code">{pass.code}</strong><small>{pass.seeded ? `Demo record ${pass.sequence} · rebuilt from news` : `Record ${pass.sequence} · ${pass.checksPassed} of ${pass.checksTotal} checks passed`}</small></div>
        </div>
        <div className="fp-pass-verify">
          {qrSvg ? <div className="fp-pass-qr" aria-label="QR code to check this FloodPass" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : null}
          <strong>Scan to check the record</strong>
          <p>The check page shows its current status and supporting details.</p>
        </div>
      </div>
      <div className="fp-pass-foot">
        {pass.seeded ? "Demo rebuilt from public news reports. This is not a person's verified report." : valid ? "A report that passed the FloodPass checks. Always check the latest record status." : "This record is cancelled. Do not rely on it as current proof."}
        {pass.approximate ? <span> Place describes an area, not an exact house.</span> : null}
      </div>
      <div className="fp-pass-actions">
        <button className="fp-btn fp-btn-primary" onClick={share}><Share2 size={17} aria-hidden="true" /> Share</button>
        <a className="fp-btn fp-btn-ghost" href={checkUrl}>Check page <ArrowUpRight size={17} aria-hidden="true" /></a>
        <a className="fp-btn fp-btn-ghost" href={`/api/floodpass/card/${encodeURIComponent(pass.code)}`} download={`FloodPass-${pass.code}.png`}><Download size={17} aria-hidden="true" /> Save picture</a>
      </div>
      {shared ? <p role="status" className="fp-pass-share-note">{shared}</p> : null}
      {wallets?.google || wallets?.apple ? <div className="fp-pass-wallets">
        {wallets.google ? <a href={`/api/floodpass/wallet/google/${encodeURIComponent(pass.code)}`}>Save to Google Wallet</a> : null}
        {wallets.apple ? <a href={`/api/floodpass/wallet/apple/${encodeURIComponent(pass.code)}`}>Add to Apple Wallet</a> : null}
      </div> : null}
    </article>
  );
}
