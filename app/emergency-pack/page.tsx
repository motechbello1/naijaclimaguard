"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BatteryCharging, CheckCircle2, FileText, HeartPulse, Home, MapPin, Phone, Printer, Radio, ShieldAlert, Wifi, WifiOff } from "lucide-react";

const STEPS = [
  { icon: ShieldAlert, title: "Official warning first", text: "If an authority tells you to move, evacuate or avoid an area, follow that instruction. A low app score must never override it." },
  { icon: MapPin, title: "Avoid floodwater", text: "Do not walk, drive or send children through flooded roads, drains, channels or fast-moving water." },
  { icon: Phone, title: "Keep communication ready", text: "Charge phones and power banks. Write down important contacts so they are available even if your phone cannot load cloud data." },
  { icon: FileText, title: "Protect essentials", text: "Keep medicines, identity documents and other essential records together and easy to carry." },
  { icon: Home, title: "Move valuables higher", text: "If it is safe and there is time, move important portable items and electrical equipment away from low floors and exposed areas." },
  { icon: HeartPulse, title: "Prioritise people", text: "Help children, older people, people with disabilities and anyone who needs extra assistance before protecting property." },
];

export default function EmergencyPackPage() {
  const [online, setOnline] = useState(true);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => caches.open("naijaclimaguard-emergency-v1").then((cache) => cache.match("/emergency-pack")).then((match) => setCached(Boolean(match)))).catch(() => undefined);
    }
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);

  return (
    <main className="min-h-screen bg-cloud text-slate-900 dark:bg-midnight dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/action-center" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-midnight-border dark:bg-midnight-light"><ArrowLeft className="h-4 w-4" /> Action Center</Link>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${online ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300" : "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200"}`}>{online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{online ? "Online" : "Offline"}{cached && " · pack cached"}</div>
        </div>

        <section className="overflow-hidden rounded-3xl border border-radar/20 bg-gradient-to-br from-radar/10 via-white to-cyan-50 p-6 dark:via-midnight-light dark:to-cyan-950/10 sm:p-8">
          <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-radar text-white"><WifiOff className="h-6 w-6" /></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-radar">NaijaClimaGuard Emergency Pack</p><h1 className="mt-1 font-display text-3xl font-bold">Useful when the network is not.</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">This page contains general flood-safety actions only. It deliberately avoids live risk numbers, invented routes and unverified shelter locations so the cached version cannot pretend stale information is current.</p></div></div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">{STEPS.map(({ icon: Icon, title, text }, index) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-midnight-border dark:bg-midnight-light"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-radar/10 text-sm font-black text-radar">{index + 1}</span><Icon className="h-5 w-5 text-radar" /><h2 className="font-display text-base font-bold">{title}</h2></div><p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{text}</p></article>)}</section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-midnight-border dark:bg-midnight-light">
          <h2 className="font-display text-lg font-bold">Before heavy rain, prepare these offline</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["Emergency and family contacts written on paper", "Medicines and important documents together", "Charged phone and power bank", "Torch/light source and essential supplies", "A known authority-approved relocation destination if one has been given", "Photos/inventory of important assets where useful"].map((item) => <div key={item} className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-sm dark:bg-midnight/60"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-radar" />{item}</div>)}
          </div>
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button onClick={() => window.print()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-semibold dark:border-midnight-border dark:bg-midnight-light"><Printer className="h-4 w-4" /> Print / save as PDF</button>
          <Link href="/my-area" className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-semibold ${online ? "bg-radar text-white" : "pointer-events-none bg-slate-200 text-slate-500 dark:bg-slate-800"}`}><Radio className="h-4 w-4" /> {online ? "Check live conditions" : "Live check needs a connection"}</Link>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:bg-amber-950/20 dark:text-amber-100"><strong>Do not use a cached page as a current warning.</strong> When you regain connectivity, refresh live conditions and check current official instructions. If you can already see dangerous flooding, act on what is physically happening around you rather than waiting for an app update.</div>

        <div className="mt-6 flex items-center gap-3 text-xs text-slate-500"><BatteryCharging className="h-4 w-4" /><span>Low-bandwidth design: no map, no chart and no live API are required to read this emergency pack once cached.</span></div>
      </div>
    </main>
  );
}
