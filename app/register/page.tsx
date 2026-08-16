"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Heart, Loader2, Sprout, UserPlus, Waves } from "lucide-react";
import Link from "next/link";

const REGISTER_IMAGE = "https://images.unsplash.com/photo-1741110539426-fce3268c3c0d?auto=format&fit=crop&fm=jpg&q=80&w=1600";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Registration failed"); setLoading(false); return; }
      router.push("/login?registered=true");
    } catch { setError("Something went wrong"); setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-slate-950 dark:bg-midnight dark:text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[.95fr_1.05fr]">
        <section className="flex min-h-screen items-center justify-center p-4 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center justify-between"><Link href="/" className="flex items-center gap-2 font-black"><Waves className="h-5 w-5 text-emerald-700 dark:text-radar" /> NaijaClimaGuard</Link><Link href="/login" className="flex items-center gap-1 text-xs font-bold text-slate-500">Already registered? Log in</Link></div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-radar">Start free</p>
              <h1 className="mt-2 font-display text-3xl font-black tracking-tight">Create one account for the places you protect.</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">Start with exact locations. Choose whether you are protecting a family, farm, business or community after you enter the workspace.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {error && <div className="rounded-xl border border-crimson/20 bg-crimson/10 px-4 py-3 text-sm text-crimson">{error}</div>}
                <div><label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Name</label><input type="text" value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950" placeholder="Your name" /></div>
                <div><label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Email</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950" placeholder="you@example.com" required /></div>
                <div><label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Password</label><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950" placeholder="Minimum 8 characters" required minLength={8} /></div>
                <div><label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Confirm password</label><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950" placeholder="••••••••" required minLength={8} /></div>
                <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#071713] py-3.5 text-sm font-black text-white transition hover:brightness-110 disabled:opacity-60 dark:bg-[#d9ff57] dark:text-[#071713]">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{loading ? "Creating account..." : "Create my NaijaClimaGuard account"}</button>
              </form>
              <p className="mt-5 text-center text-xs leading-5 text-slate-400">Free access starts with up to 3 saved locations. Risk results remain coordinate-specific and evidence scope is labelled separately.</p>
            </div>
            <Link href="/" className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft className="h-3.5 w-3.5" /> Back to the public site</Link>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-[#071713] text-white lg:block"><img src={REGISTER_IMAGE} alt="Flood-affected community" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#06130f] via-[#06130f]/72 to-[#06130f]/20" /><div className="relative z-10 flex h-full flex-col justify-end p-10 xl:p-14"><div className="max-w-xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#d9ff57]">One platform, different lives</p><h2 className="mt-4 font-display text-5xl font-black leading-[1.02] tracking-tight">Flood intelligence should begin with what you cannot afford to lose.</h2><div className="mt-8 grid gap-3 sm:grid-cols-3"><Journey icon={Heart} label="Family" /><Journey icon={Sprout} label="Farm" /><Journey icon={Building2} label="Business" /></div><p className="mt-7 text-sm leading-6 text-white/60">Available as a national saved-place experience across Nigeria's 36 states and the FCT. Model-specific evidence remains labelled by the locations where it is actually validated.</p></div></div></section>
      </div>
    </main>
  );
}

function Journey({ icon: Icon, label }: { icon: typeof Heart; label: string }) { return <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><Icon className="h-5 w-5 text-[#d9ff57]" /><p className="mt-3 text-sm font-black">{label}</p></div>; }