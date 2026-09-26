import type { Metadata } from "next";
import Link from "next/link";
import FpShell from "@/components/floodpass/FpShell";
import { prisma } from "@/lib/db";
import { buildAddressReport, type AddressReport } from "@/lib/floodpass/address-check";
import { isFounderRequest } from "@/lib/floodpass/founder-guard";

export const metadata: Metadata = { title: "Address flood history | FloodPass", robots: { index: false } };
export const dynamic = "force-dynamic";

const LEVEL_TEXT: Record<AddressReport["level"], { label: string; tone: string }> = {
  MANY_FLOODS_KNOWN: { label: "Strong flood history", tone: "fp-status-red" },
  SOME_FLOODS_KNOWN: { label: "Some floods recorded", tone: "fp-status-amber" },
  NONE_FOUND_YET: { label: "No flood records found yet", tone: "fp-status-blue" },
};

function date(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
}

export default async function Page({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase().slice(0, 20);
  const check = await prisma.addressCheck.findUnique({ where: { code } }).catch(() => null);
  const founder = await isFounderRequest().catch(() => false);
  let report: AddressReport | null = check?.status === "PAID" && check.result ? (check.result as unknown as AddressReport) : null;
  let preview = false;
  if (!report && check && founder) { report = await buildAddressReport(check.latitude, check.longitude, check.placeName); preview = true; }

  return (
    <FpShell active="plans">
      <div className="fp-stack" style={{ gap: 20 }}>
        <h1 className="fp-h1">Flood history</h1>
        {!check ? <p className="fp-status fp-status-amber" style={{ margin: 0 }}>No address check with the code {code}.</p> : null}
        {check && !report ? (
          <section className="fp-card fp-stack">
            <p style={{ margin: 0 }}>The report for <strong>{check.placeName}</strong> is ready once payment is confirmed.</p>
            <Link className="fp-btn fp-btn-primary" href={`/floodpass/plans/address_check?check=${code}`}>Pay N5,000 and see the report</Link>
          </section>
        ) : null}
        {report ? (
          <>
            {preview ? <p className="fp-small fp-muted" style={{ margin: 0 }}>Founder preview (not paid).</p> : null}
            <div className={`fp-status ${LEVEL_TEXT[report.level].tone} fp-stack`}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{LEVEL_TEXT[report.level].label}</p>
              <p style={{ margin: 0 }}>{report.summary}</p>
            </div>
            <section className="fp-card fp-stack">
              <h2 className="fp-h2">What we found</h2>
              <dl className="fp-kv">
                <dt>Place</dt><dd>{report.place}{report.state ? `, ${report.state}` : ""}</dd>
                <dt>Verified floods within 1 km</dt><dd>{report.verifiedFloods.count}</dd>
                <dt>Known flood spot</dt><dd>{report.hotspot ? `${report.hotspot.name}, ${report.hotspot.distanceM} m away` : "none known"}</dd>
                <dt>Floods in the news (3 years)</dt><dd>{report.newsFloods.count}</dd>
                <dt>Blocked drains nearby</dt><dd>{report.blockedDrainsNearby}</dd>
                <dt>Rain that floods it</dt><dd>{report.streetMemory.thresholdMm != null ? `about ${Math.round(report.streetMemory.thresholdMm)} mm in a day (${report.streetMemory.confidence} confidence)` : "not learned yet"}</dd>
                <dt>Checked</dt><dd>{date(report.checkedAt)}</dd>
              </dl>
            </section>
            {report.verifiedFloods.recent.length ? (
              <section className="fp-card fp-stack">
                <h2 className="fp-h2">Verified floods</h2>
                <ul className="fp-list">{report.verifiedFloods.recent.map((f) => <li key={f.code}><Link className="fp-link" href={`/pass/${f.code}`}>{f.code}</Link>: {date(f.floodedAt)}, {f.depth.toLowerCase().replace("_", " ")}, {f.distanceM} m away</li>)}</ul>
              </section>
            ) : null}
            {report.newsFloods.recent.length ? (
              <section className="fp-card fp-stack">
                <h2 className="fp-h2">In the news</h2>
                <ul className="fp-list">{report.newsFloods.recent.map((n) => <li key={n.url}><a className="fp-link" href={n.url} target="_blank" rel="noreferrer">{n.title}</a> <span className="fp-small fp-muted">({n.source}, {date(n.publishedAt)})</span></li>)}</ul>
              </section>
            ) : null}
            {report.hotspot ? <p style={{ margin: 0 }}>About {report.hotspot.name}: {report.hotspot.note}</p> : null}
            <section className="fp-card fp-stack">
              <h2 className="fp-h2">Limits</h2>
              <ul style={{ margin: 0, paddingLeft: 22 }}>{report.limits.map((l) => <li key={l}>{l}</li>)}</ul>
            </section>
          </>
        ) : null}
      </div>
    </FpShell>
  );
}
