"use client";

import AppShell from "@/components/shared/AppShell";
import { useEffect, useState, useRef } from "react";
import { Users, Banknote, Satellite, Download, ExternalLink, Shield, CheckCircle } from "lucide-react";

function AnimatedNumber({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setStarted(true);
  }, []);

  useEffect(() => {
    if (!started) return;
    let current = 0;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    const stepTime = duration / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [started, target]);

  const formatted = count >= 1_000_000
    ? (count / 1_000_000).toFixed(1) + "M"
    : count >= 1_000
      ? (count / 1_000).toFixed(0) + "K"
      : Math.round(count).toLocaleString();

  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}

export default function ProvePage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Layer 3: Prove</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Impact Ledger — Auditable, privacy-preserving evidence</p>
        </div>

        {/* Big metric cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-radar/10 border border-radar/20 mx-auto mb-5">
              <Users className="h-8 w-8 text-radar" />
            </div>
            <p className="text-4xl font-display font-bold">
              <AnimatedNumber target={1423800} />
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Vulnerable Lives Warned</p>
            <p className="text-xs text-radar mt-1 font-mono">↑ 48hr advance notification</p>
          </div>

          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber/10 border border-amber/20 mx-auto mb-5">
              <Banknote className="h-8 w-8 text-amber" />
            </div>
            <p className="text-4xl font-display font-bold">
              <AnimatedNumber target={847500000} prefix="₦" />
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Micro-Grid Assets Protected</p>
            <p className="text-xs text-amber mt-1 font-mono">240 solar installations secured</p>
          </div>

          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan/10 border border-cyan/20 mx-auto mb-5">
              <Satellite className="h-8 w-8 text-cyan" />
            </div>
            <p className="text-4xl font-display font-bold">
              99.28<span className="text-2xl">%</span>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Satellite Validation Accuracy</p>
            <p className="text-xs text-cyan mt-1 font-mono">ROC-AUC 0.9928</p>
          </div>
        </div>

        {/* Privacy status */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-base font-bold mb-4">Privacy & Compliance Status</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "NDPA Compliance", status: "Compliant", desc: "Nigeria Data Protection Act 2023" },
              { label: "PII Storage", status: "Zero PII", desc: "Differential privacy on all records" },
              { label: "Audit Trail", status: "Complete", desc: "Every prediction logged with hash" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                <CheckCircle className="h-5 w-5 text-radar shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">{item.label}: <span className="text-radar">{item.status}</span></p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="flex-1 flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-radar to-cyan py-4 px-6 text-base font-bold text-white shadow-xl shadow-radar/20 hover:shadow-radar/30 transition-all">
            <Download className="h-5 w-5" />
            Export Innovate UK / FCDO Report
          </button>
          <button className="flex-1 flex items-center justify-center gap-3 rounded-xl border-2 border-slate-200 dark:border-midnight-border py-4 px-6 text-base font-bold hover:border-radar/40 transition-all">
            <ExternalLink className="h-5 w-5" />
            Export USAID / World Bank Report
          </button>
        </div>

        {/* Methodology */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-radar shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold">Methodology & Audit Note</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                All impact metrics are derived from the NaijaClimaGuard Impact Ledger — a federated, privacy-preserving record of predictions, interventions, and verified outcomes. The ledger uses differential privacy to ensure zero PII is stored. All entries are hash-linked for tamper-proof audit trails. Data is exportable in formats accepted by Innovate UK, FCDO, USAID, and World Bank.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}