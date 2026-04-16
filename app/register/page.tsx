"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, UserPlus, Loader2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be 8+ characters"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); setLoading(false); return; }
      router.push("/login?registered=true");
    } catch { setError("Something went wrong"); setLoading(false); }
  };

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
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Create your risk intelligence account</p>
        </div>
        <div className="glass-card rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-lg bg-crimson/10 border border-crimson/20 px-4 py-3 text-sm text-crimson">{error}</div>}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none" placeholder="Bello Muhammad" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none" placeholder="you@company.com" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none" placeholder="Minimum 8 characters" required minLength={8} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none" placeholder="••••••••" required minLength={8} />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-radar py-3 text-sm font-semibold text-white hover:bg-radar/90 shadow-lg shadow-radar/20 transition-all flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-midnight-border text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Already have an account? <Link href="/login" className="text-radar font-medium hover:underline">Sign in</Link></p>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Free tier: 3 locations, daily updates, email alerts.</p>
      </div>
    </div>
  );
}
