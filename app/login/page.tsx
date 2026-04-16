"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, LogIn, Loader2 } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) { setError("Invalid email or password"); setLoading(false); }
    else router.push("/dashboard");
  };

  return (
    <div className="glass-card rounded-2xl p-8">
      {registered && (
        <div className="rounded-lg bg-radar/10 border border-radar/20 px-4 py-3 text-sm text-radar mb-4">
          Account created! Sign in to continue.
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="rounded-lg bg-crimson/10 border border-crimson/20 px-4 py-3 text-sm text-crimson">{error}</div>}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none transition-colors" placeholder="you@company.com" required />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none transition-colors" placeholder="••••••••" required />
        </div>
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-radar py-3 text-sm font-semibold text-white hover:bg-radar/90 shadow-lg shadow-radar/20 transition-all flex items-center justify-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-midnight-border text-center space-y-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No account? <Link href="/register" className="text-radar font-medium hover:underline">Create one free</Link>
        </p>
        <div className="text-xs text-slate-400 space-y-1">
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
    <div className="min-h-screen flex items-center justify-center bg-cloud dark:bg-midnight p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-radar/10 border border-radar/20">
              <Shield className="h-5 w-5 text-radar" />
            </div>
            <span className="font-display text-xl font-bold">NaijaClima<span className="text-radar">Guard</span></span>
          </Link>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Sign in to your risk dashboard</p>
        </div>
        <Suspense fallback={<div className="glass-card rounded-2xl p-8 text-center">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}