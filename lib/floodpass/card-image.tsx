import { ImageResponse } from "next/og";
import React from "react";
import QRCode from "qrcode";
import type { PublicPass } from "@/lib/floodpass/service";

/** Shareable picture and link preview for a FloodPass record. */
export async function renderPassCard(input: { pass: PublicPass | null; code: string; checkUrl: string; og: boolean }) {
  const { pass, code, checkUrl, og } = input;
  const width = og ? 1200 : 1080;
  const height = og ? 630 : 1350;
  const qr = pass ? await QRCode.toDataURL(checkUrl, { margin: 1, width: og ? 270 : 350, errorCorrectionLevel: "M" }) : null;
  const when = pass ? new Date(pass.floodedAt).toLocaleString("en-NG", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" }) : "";
  const valid = pass?.status === "VERIFIED";
  const state = pass ? pass.seeded ? "RECONSTRUCTED DEMO" : valid ? "VERIFIED REPORT" : "CANCELLED RECORD" : "NOT FOUND";
  const navy = pass?.seeded ? "#59422e" : "#102d48";
  const ink = "#102a43";
  const muted = "#4a6173";
  return new ImageResponse(
    (
      <div style={{ width, height, display: "flex", flexDirection: "column", background: "#f3f5f3", fontFamily: "sans-serif", color: ink }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: navy, color: "#f3f9fa", padding: og ? "27px 44px" : "40px 52px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: og ? 39 : 52, fontWeight: 800, letterSpacing: -2 }}>FloodPass</div>
            <div style={{ display: "flex", fontSize: og ? 11 : 14, fontWeight: 700, letterSpacing: 4, color: "#b9dce5" }}>BY NAIJACLIMAGUARD</div>
          </div>
          <div style={{ display: "flex", border: "1px solid #a8dbe4", padding: og ? "9px 13px" : "13px 17px", fontSize: og ? 16 : 21, fontWeight: 800, letterSpacing: 2, color: pass?.seeded ? "#ffe2a6" : "#b9edf1" }}>{state}</div>
        </div>
        {pass ? (
          <div style={{ display: "flex", flexDirection: og ? "row" : "column", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: og ? "34px 44px 28px" : "50px 56px 30px", minWidth: 0 }}>
              <div style={{ display: "flex", color: "#155184", fontSize: og ? 14 : 19, fontWeight: 800, letterSpacing: 3 }}>01 / PLACE RECORDED</div>
              <div style={{ display: "flex", marginTop: 12, fontSize: og ? 43 : 63, lineHeight: 1.08, fontWeight: 800, letterSpacing: -2 }}>{`${pass.placeName}${pass.state ? `, ${pass.state}` : ""}`}</div>
              <div style={{ display: "flex", gap: og ? 26 : 65, marginTop: og ? 28 : 44, paddingTop: og ? 19 : 30, borderTop: "1px solid #ccd9dd" }}>
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", color: "#155184", fontSize: og ? 13 : 18, fontWeight: 800, letterSpacing: 2 }}>02 / WHEN</div>
                  <div style={{ display: "flex", marginTop: 9, fontSize: og ? 24 : 34, fontWeight: 700 }}>{when}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", color: "#155184", fontSize: og ? 13 : 18, fontWeight: 800, letterSpacing: 2 }}>03 / WATER LEVEL</div>
                  <div style={{ display: "flex", marginTop: 9, fontSize: og ? 24 : 34, fontWeight: 700 }}>{pass.depthWords}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", marginTop: og ? 24 : 43, paddingTop: og ? 18 : 28, borderTop: "1px solid #ccd9dd" }}>
                <div style={{ display: "flex", color: "#155184", fontSize: og ? 13 : 18, fontWeight: 800, letterSpacing: 2 }}>FLOODPASS CODE</div>
                <div style={{ display: "flex", fontSize: og ? 46 : 70, fontWeight: 800, letterSpacing: og ? 2 : 4 }}>{pass.code}</div>
                <div style={{ display: "flex", color: muted, fontSize: og ? 15 : 22 }}>{pass.seeded ? `Demo record ${pass.sequence} · rebuilt from news` : `Record ${pass.sequence} · ${pass.checksPassed} of ${pass.checksTotal} checks passed`}</div>
              </div>
            </div>
            {qr ? <div style={{ display: "flex", flexDirection: og ? "column" : "row", alignItems: "center", justifyContent: "center", gap: og ? 12 : 38, background: "#e3efed", borderLeft: og ? "1px dashed #b7cbd0" : "none", borderTop: og ? "none" : "1px dashed #b7cbd0", padding: og ? "25px 32px" : "35px 56px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} width={og ? 230 : 340} height={og ? 230 : 340} alt="" style={{ background: "#ffffff", padding: og ? 8 : 13 }} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: og ? "center" : "flex-start", gap: 7 }}>
                <div style={{ display: "flex", fontSize: og ? 18 : 31, fontWeight: 800 }}>Scan to check</div>
                <div style={{ display: "flex", color: muted, fontSize: og ? 14 : 22 }}>See the current record status.</div>
              </div>
            </div> : null}
          </div>
        ) : <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", fontSize: 48 }}>{`No FloodPass ${code}`}</div>}
        <div style={{ display: "flex", padding: og ? "14px 44px" : "25px 56px", background: pass?.seeded ? "#fff1cf" : "#e3efed", color: pass?.seeded ? "#674009" : muted, fontSize: og ? 15 : 22, fontWeight: pass?.seeded ? 700 : 500 }}>
          {pass?.seeded ? "Demo rebuilt from public news reports, not a person's verified report." : "Check the latest status and details before using this record."}
        </div>
      </div>
    ),
    { width, height, headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
  );
}
