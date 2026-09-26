"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import AccountFrame from "@/components/auth/AccountFrame";

function LoginForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"user" | "founder">(searchParams.get("mode") === "founder" ? "founder" : "user");
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const registered = searchParams.get("registered") === "true";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const provider = mode === "founder" ? "founder-credentials" : "credentials";
      const result = await signIn(provider, mode === "founder"
        ? { username: identity, password, redirect: false }
        : { email: identity, password, redirect: false });
      if (result?.error || !result?.ok) {
        setError(mode === "founder" ? "Invalid founder username or password" : "Invalid email or password");
        return;
      }
      const requested = searchParams.get("callbackUrl");
      const safeDestination = requested?.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/\\") ? requested : null;
      router.push(safeDestination || (mode === "founder" ? "/admin" : "/dashboard"));
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ncg-entry-form">
      <span className="ncg-entry-eyebrow">WELCOME BACK / YOUR WORKSPACE</span>
      <h1>Pick up where<br /><em>you left off.</em></h1>
      <p>Your saved places, warnings, actions and evidence are ready when you need them.</p>
      {registered && <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:border-radar/20 dark:bg-radar/10 dark:text-radar"><CheckCircle2 className="h-4 w-4" /> Account created. Sign in to protect your places.</div>}
      <div className="ncg-entry-switch" aria-label="Choose account access">
        <button type="button" aria-pressed={mode === "user"} onClick={() => { setMode("user"); setIdentity(""); setError(""); }}>Personal & organisation</button>
        <button type="button" aria-pressed={mode === "founder"} onClick={() => { setMode("founder"); setIdentity(""); setError(""); }}>Founder access</button>
      </div>
      <form onSubmit={handleSubmit} className="ncg-entry-fields">
        {error && <div className="rounded-xl border border-crimson/20 bg-crimson/10 px-4 py-3 text-sm text-crimson">{error}</div>}
        <div><label htmlFor="ncg-login-identity">{mode === "founder" ? "Founder username" : "Email address"}</label><input id="ncg-login-identity" type={mode === "founder" ? "text" : "email"} value={identity} onChange={(event) => setIdentity(event.target.value)} autoComplete={mode === "founder" ? "username" : "email"} placeholder={mode === "founder" ? "Founder username" : "you@example.com"} required /></div>
        <div><label htmlFor="ncg-login-password">Password</label><input id="ncg-login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" required /></div>
        <button type="submit" disabled={loading} className="ncg-entry-submit"><span>{loading ? "Signing in..." : mode === "founder" ? "Open founder command" : "Open my workspace"}</span>{loading ? <Loader2 size={19} className="animate-spin" /> : <ArrowUpRight size={20} />}</button>
      </form>
      {mode === "user" ? <p className="ncg-entry-alternate">New here? <Link href="/register">Create your free account</Link></p> : <p className="ncg-entry-note">Founder access is separate. Choosing a family, farm, business or agency view does not grant founder permissions.</p>}
    </div>
  );
}

export default function LoginPage() {
  return <AccountFrame kind="login"><Suspense fallback={<div className="ncg-entry-form">Opening sign in…</div>}><LoginForm /></Suspense></AccountFrame>;
}
