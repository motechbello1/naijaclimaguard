import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import FpShell from "@/components/floodpass/FpShell";
import PassCard from "@/components/floodpass/PassCard";
import { getPublicPass, isStorageNotReady, type PublicPass } from "@/lib/floodpass/service";
import { looksLikePassCode, normalizePassCode } from "@/lib/floodpass/ledger";
import { publicBaseUrl } from "@/lib/floodpass/conversation-runner";
import { googleWalletConfigured } from "@/lib/floodpass/wallet/google";
import { appleWalletConfigured } from "@/lib/floodpass/wallet/apple";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const code = normalizePassCode(decodeURIComponent(params.code));
  const image = `${publicBaseUrl()}/api/floodpass/card/${encodeURIComponent(code)}?format=og`;
  // The picture shows when the link is shared on WhatsApp.
  return {
    title: `FloodPass ${code}`,
    description: "Check the place, time and status of this FloodPass record.",
    openGraph: { title: `FloodPass ${code}`, description: "Check the place, time and status of this FloodPass record.", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function Page({ params }: { params: { code: string } }) {
  const code = normalizePassCode(decodeURIComponent(params.code));
  let pass: PublicPass | null = null;
  let problem: string | null = null;
  if (!looksLikePassCode(code)) problem = "That does not look like a FloodPass code. Codes look like FP-ABJ-7K2Q.";
  else {
    try { pass = await getPublicPass(code); } catch (error) { problem = isStorageNotReady(error) ? "FloodPass storage is not switched on yet." : "We could not load this FloodPass. Please try again."; }
  }
  const checkUrl = `${publicBaseUrl()}/check?code=${encodeURIComponent(code)}`;
  const qrSvg = pass ? await QRCode.toString(checkUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" }) : null;

  return (
    <FpShell>
      <div className="fp-inner-page fp-stack" style={{ gap: 20 }}>
        <div className="fp-page-intro">
          <p className="fp-overline">THE FLOOD RECORD / CHECK THE DETAILS</p>
          <h1 className="fp-h1">FloodPass record.</h1>
        </div>
        {pass ? (
          <PassCard pass={pass} qrSvg={qrSvg} checkUrl={checkUrl} wallets={{ google: googleWalletConfigured(), apple: appleWalletConfigured() }} />
        ) : (
          <div className="fp-status fp-status-amber fp-stack">
            <p style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Not found</p>
            <p style={{ margin: 0 }}>{problem ?? `No FloodPass has the code ${code}.`}</p>
          </div>
        )}
        <p className="fp-muted" style={{ margin: 0, fontSize: 15 }}>Read the status and any demo label on the card. FloodPass records show the checks used for a report; the record also carries a fingerprint that can be rechecked.</p>
        <Link className="fp-btn fp-btn-ghost" href="/">FloodPass home</Link>
      </div>
    </FpShell>
  );
}
