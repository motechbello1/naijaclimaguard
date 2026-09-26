"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Building2, House, Landmark, Sprout } from "lucide-react";
import LanguageSelector from "@/components/shared/LanguageSelector";
import { BrandLockup } from "@/components/shared/BrandLogo";
import "@/app/account-v2.css";

const ROLES = [
  { label: "Home & family", Icon: House },
  { label: "Farmer", Icon: Sprout },
  { label: "Business", Icon: Building2 },
  { label: "Agency", Icon: Landmark },
];

export default function AccountFrame({ kind, children }: { kind: "login" | "register"; children: React.ReactNode }) {
  return <main className="ncg-entry">
    <header className="ncg-entry-header">
      <BrandLockup inverse href="/" />
      <div><LanguageSelector compact /><Link href="/" className="ncg-entry-back"><ArrowLeft size={15} /> Public site</Link></div>
    </header>
    <div className="ncg-entry-grid">
      <section className="ncg-entry-story" aria-label="The NaijaClimaGuard workspace">
        <div className="ncg-entry-photo" />
        <div className="ncg-entry-story-content">
          <span className="ncg-entry-index">01 / THE PLACES WE PROTECT</span>
          <div><h2>{kind === "login" ? <>The story<br />continues <em>here.</em></> : <>Start with<br />what <em>matters.</em></>}</h2><p>One place to understand the risk, decide what to do, and keep a record of what happened.</p></div>
          <div className="ncg-entry-role-grid">{ROLES.map(({ label, Icon }, i) => <div key={label}><span>0{i + 1}</span><Icon size={19} strokeWidth={1.6} /><strong>{label}</strong></div>)}</div>
        </div>
      </section>
      <section className="ncg-entry-panel"><div className="ncg-entry-panel-inner"><div className="ncg-entry-panel-top"><span>NAIJACLIMAGUARD / ACCOUNT</span><span>{kind === "login" ? "RETURNING" : "NEW ACCOUNT"}</span></div>{children}<div className="ncg-entry-panel-foot"><span>Know before. Act together. Prove after.</span><Link href="/floodpass/coverage">Explore the evidence <ArrowUpRight size={15} /></Link></div></div></section>
    </div>
  </main>;
}
