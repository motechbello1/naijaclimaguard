"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, Loader2, ShieldCheck } from "lucide-react";

export default function UpgradePage() {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const router = useRouter();

  const startCheckout = async () => {
    setState("loading");
    setError("");
    try {
      const response = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "professional" }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.push("/login?next=%2Fupgrade%3Fplan%3Dprofessional");
        return;
      }
      if (!response.ok || !data.authorization_url) {
        throw new Error(data.error || "Could not start secure checkout.");
      }
      window.location.assign(data.authorization_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start secure checkout.");
      setState("error");
    }
  };

  return (
    <main className="min-h-screen bg-cloud px-4 py-10 text-slate-900 dark:bg-midnight dark:text-slate-100 sm:py-16">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-radar">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-radar/10 text-radar">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-radar">Professional</p>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Upgrade your NaijaClimaGuard account</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">Secure checkout is tied to the account you sign in with. Enterprise access is contract-managed and cannot be purchased through this page.</p>
            </div>
          </div>

          <div className="mt-7 flex items-end gap-2">
            <span className="font-display text-4xl font-bold">₦15,000</span>
            <span className="pb-1 text-sm text-slate-500">/ month</span>
          </div>

          <ul className="mt-6 space-y-3 text-sm">
            {["Expanded location monitoring", "Dashboard risk views", "REST API access", "Email alert rules", "Downloadable situation reports", "Historical views"].map((item) => (
              <li key={item} className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-radar" /><span>{item}</span></li>
            ))}
          </ul>

          {error && <div className="mt-6 rounded-xl border border-crimson/20 bg-crimson/5 p-4 text-sm text-crimson">{error}</div>}

          <button
            type="button"
            onClick={startCheckout}
            disabled={state === "loading"}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-radar px-5 py-3.5 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {state === "loading" ? "Opening secure checkout…" : "Continue to secure checkout"}
          </button>

          <p className="mt-3 text-center text-xs leading-relaxed text-slate-400">Payment is verified server-to-server before your plan changes. A successful unrelated transaction cannot grant NaijaClimaGuard access.</p>
        </div>
      </div>
    </main>
  );
}
