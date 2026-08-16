"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, LogIn, Loader2 } from "lucide-react";
import Link from "next/link";

function safeCallback(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  if (value.startsWith("/login") || value.startsWith("/register")) return "/dashboard";
  return value;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const registered = searchParams.get("registered") === "true";
  const loggedOut = searchParams.get("loggedOut") === "1";
  const callbackUrl = useMemo(() => safeCallback(searchParams.get("callbackUrl")), [searchParams]);

  useEffect(() => {
    if (status === "authenticated" && !loggedOut) router.replace(callbackUrl);
  }, [status, loggedOut, callbackUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }
    router.replace(callbackUrl);
    router.refresh();
  };

  return (
    <div className="glass-card rounded-3xl p-7 sm:p-8">
      {registered && <div className="mb-4 rounded-xl border border-radar/20 bg-radar/10 px-4 py-3 text-sm text-radar animate-slide-down">Account created. Sign in to continue.</div>}
      {loggedOut && <div className="mb-4 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500 animate-slide-down dark:border-midnight-border dark:bg-midnight-light/70 dark:text-slate-300">You have been signed out securely.</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="rounded-xl border border-crimson/20 bg-crimson/10 px-4 py-3 text-sm text-crimson animate-slide-down">{error}</div>}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@company.com" autoComplete="email" required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" autoComplete="current-password" required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <div className="mt-6 space-y-2 border-t border-slate-100 pt-6 text-center dark:border-midnight-border">
        <p className="text-sm text-slate-500 dark:text-slate-400">No account? <Link href="/register" className="font-medium text-radar hover:underline">Create one free</Link></p>
        <div className="space-y-1 text-xs text-slate-400">
          <p className="font-bold">Demo accounts (password: demo1234)</p>
          <p>free@naijaclimaguard.com (Free plan)</p>
          <p>pro@naijaclimaguard.com (Professional)</p>
          <p>enterprise@naijaclimaguard.com (Enterprise)</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cloud p-4 dark:bg-midnight">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.10),transparent_38%)]" />
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 transition-transform duration-300 hover:scale-[1.015] active:scale-[0.985]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-radar/20 bg-radar/10 shadow-[0_12px_36px_rgba(16,185,129,0.10)]"><Shield className="h-5 w-5 text-radar" /></div>
            <span className="font-display text-xl font-bold tracking-[-0.02em]">NaijaClima<span className="text-radar">Guard</span></span>
          </Link>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Sign in to your risk dashboard</p>
        </div>
        <Suspense fallback={<div className="glass-card rounded-3xl p-8 text-center">Loading...</div>}><LoginForm /></Suspense>
      </div>
    </div>
  );
}
