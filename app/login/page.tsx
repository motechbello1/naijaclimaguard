"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole, LogIn, MapPin, Waves } from "lucide-react";
import Link from "next/link";

const LOGIN_IMAGE = "https://images.unsplash.com/photo-1741110539426-fce3268c3c0d?auto=format&fit=crop&fm=jpg&q=80&w=1600";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) { setError("Invalid email or password"); setLoading(false); }
    else router.push("/dashboard");
  };

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      {registered && <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:border-radar/20 dark:bg-radar/10 dark:text-radar"><CheckCircle2 className="h-4 w-4" /> Account created. Sign in to protect your places.</div>}
      <div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-radar">Welcome back</p><h1 className="mt-2 font-display text-3xl font-black tracking-tight">Open your climate-risk workspace.</h1><p className="mt-2 text-sm text-slate-500">Your saved homes, farms, businesses and community locations stay together in one account.</p></div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="rounded-xl border border-crimson/20 bg-crimson/10 px-4 py-3 text-sm text-crimson">{error}</div>}
        <div><label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Email</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950" placeholder="you@example.com" required /></div>
        <div><label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Password</label><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950" placeholder="••••••••" required /></div>
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#071713] py-3.5 text-sm font-black text-white transition hover:brightness-110 disabled:opacity-60 dark:bg-[#d9ff57] dark:text-[#071713]">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}{loading ? "Signing in..." : "Log in to NaijaClimaGuard"}</button>
      </form>
      <div className="mt-6 border-t border-slate-100 pt-6 text-center dark:border-slate-800"><p className="text-sm text-slate-500">New here? <Link href="/register" className="font-black text-emerald-700 hover:underline dark:text-radar">Create your free account</Link></p></div>
      <details className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-950"><summary className="cursor-pointer font-bold">Demo access</summary><div className="mt-2 space-y-1"><p>Password: demo1234</p><p>free@naijaclimaguard.com</p><p>pro@naijaclimaguard.com</p><p>enterprise@naijaclimaguard.com</p></div></details>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f2] text-slate-950 dark:bg-midnight dark:text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-[#071713] text-white lg:block"><img src={LOGIN_IMAGE} alt="Flood-affected community" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#06130f] via-[#06130f]/70 to-[#06130f]/20" /><div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14"><Link href="/" className="flex items-center gap-2.5 font-black"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10"><Waves className="h-5 w-5 text-[#d9ff57]" /></span>NaijaClimaGuard</Link><div className="max-w-xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#d9ff57]">36 states + FCT</p><h2 className="mt-4 font-display text-5xl font-black leading-[1.02] tracking-tight">Come back to the places that matter to you.</h2><div className="mt-7 space-y-3 text-sm text-white/70"><p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#d9ff57]" /> Monitor exact saved locations across Nigeria</p><p className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[#d9ff57]" /> Keep personal and institutional workspaces separated by account</p></div></div></div></section>
        <section className="flex min-h-screen items-center justify-center p-4 sm:p-8 lg:p-12"><div className="w-full max-w-md"><div className="mb-6 flex items-center justify-between lg:hidden"><Link href="/" className="flex items-center gap-2 font-black"><Waves className="h-5 w-5 text-emerald-700" /> NaijaClimaGuard</Link><Link href="/" className="flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft className="h-3.5 w-3.5" /> Home</Link></div><Suspense fallback={<div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center">Loading...</div>}><LoginForm /></Suspense></div></section>
      </div>
    </main>
  );
}