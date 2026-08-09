"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Languages, Loader2, MessageCircle, Phone, ShieldCheck, Volume2 } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";
import type { AppLocale } from "@/lib/i18n/config";

interface DeliveryState {
  phone: string | null;
  phoneMasked: string | null;
  phoneVerified: boolean;
  platformLanguage: string;
  preferredLanguage: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  voiceEnabled: boolean;
}

const LANGUAGES = [["ENGLISH", "English", "en"], ["PIDGIN", "Naija Pidgin", "pcm"], ["HAUSA", "Hausa", "ha"], ["YORUBA", "Yorùbá", "yo"], ["IGBO", "Igbo", "ig"]] as const;

export default function DeliveryPreferencesCard() {
  const { setLocale } = useLanguage();
  const [delivery, setDelivery] = useState<DeliveryState | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await fetch("/api/profile/delivery", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Delivery settings unavailable.");
      setDelivery(data.delivery); setPhone(data.delivery.phone || "");
    } catch (err) { setError(err instanceof Error ? err.message : "Delivery settings unavailable."); }
  };
  useEffect(() => { load(); }, []);

  const save = async (patch: Record<string, unknown>, success = "Settings saved.") => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/profile/delivery", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save settings.");
      setDelivery(data.delivery); setPhone(data.delivery.phone || ""); setMessage(success);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save settings."); }
    finally { setBusy(false); }
  };

  const changePlatformLanguage = (serverValue: string) => {
    const match = LANGUAGES.find(([value]) => value === serverValue);
    if (match) setLocale(match[2] as AppLocale);
    save({ platformLanguage: serverValue }, "Platform language saved.");
  };

  const requestCode = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      if (phone !== (delivery?.phone || "")) {
        const response = await fetch("/api/profile/delivery", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save phone number."); setDelivery(data.delivery);
      }
      const response = await fetch("/api/profile/phone-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "REQUEST" }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not send verification code."); setMessage("Verification code sent by SMS. It expires in 10 minutes.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send verification code."); }
    finally { setBusy(false); }
  };

  const verifyCode = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/profile/phone-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "VERIFY", code }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not verify phone number."); setCode(""); setMessage("Phone verified. You can now enable phone-based flood alerts."); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not verify phone number."); }
    finally { setBusy(false); }
  };

  const toggle = (key: "emailEnabled" | "smsEnabled" | "whatsappEnabled" | "voiceEnabled") => { if (delivery) save({ [key]: !delivery[key] }); };

  return <div className="glass-card rounded-xl p-4 sm:p-6">
    <div className="flex items-start gap-3"><Phone className="mt-0.5 h-5 w-5 shrink-0 text-radar" /><div><h2 className="text-sm font-bold">Language & delivery</h2><p className="mt-1 text-sm text-slate-500">Choose how the platform speaks to you and how flood alerts should reach you.</p></div></div>
    {error && <div className="mt-4 rounded-lg border border-crimson/20 bg-crimson/5 px-4 py-3 text-sm text-crimson">{error}</div>}
    {message && <div className="mt-4 rounded-lg border border-radar/20 bg-radar/5 px-4 py-3 text-sm text-radar">{message}</div>}
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="rounded-xl border border-slate-200 p-4 dark:border-midnight-border"><span className="flex items-center gap-2 text-sm font-semibold"><Languages className="h-4 w-4 text-radar" /> Platform language</span><span className="mt-1 block text-xs text-slate-500">Menus, pages, guidance and assistant.</span><select value={delivery?.platformLanguage || "ENGLISH"} onChange={(e) => changePlatformLanguage(e.target.value)} className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm dark:border-midnight-border dark:bg-midnight">{LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="rounded-xl border border-slate-200 p-4 dark:border-midnight-border"><span className="flex items-center gap-2 text-sm font-semibold"><MessageCircle className="h-4 w-4 text-radar" /> Alert language</span><span className="mt-1 block text-xs text-slate-500">SMS, WhatsApp, voice and alert text.</span><select value={delivery?.preferredLanguage || "ENGLISH"} onChange={(e) => save({ preferredLanguage: e.target.value }, "Alert language saved.")} className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm dark:border-midnight-border dark:bg-midnight">{LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">Platform language and alert language are independent. Safety-critical outbound Hausa, Yorùbá, Igbo and Pidgin emergency templates continue to use the approved English fallback until each translated emergency template is independently reviewed.</p>

      <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Phone number</label><div className="flex flex-col gap-2 sm:flex-row"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803… or +234803…" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm focus:border-radar focus:outline-none dark:border-midnight-border dark:bg-midnight" /><button onClick={requestCode} disabled={busy || !phone} className="rounded-lg border border-radar/30 px-4 py-3 text-sm font-semibold text-radar disabled:opacity-40">{busy ? "Please wait…" : delivery?.phoneVerified && phone === delivery.phone ? "Verified" : "Verify phone"}</button></div>{delivery?.phoneVerified && phone === delivery.phone && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-radar"><ShieldCheck className="h-3.5 w-3.5" /> Verified for emergency delivery</p>}</div>
      {!delivery?.phoneVerified && delivery?.phone && <div className="rounded-xl border border-slate-200 p-4 dark:border-midnight-border"><p className="text-sm font-semibold">Enter the 6-digit SMS code</p><div className="mt-2 flex flex-col gap-2 min-[380px]:flex-row"><input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-lg tracking-widest dark:border-midnight-border dark:bg-midnight" /><button onClick={verifyCode} disabled={busy || code.length !== 6} className="rounded-lg bg-radar px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Confirm</button></div></div>}

      <div className="grid gap-3 sm:grid-cols-2">{delivery && <><button onClick={() => toggle("emailEnabled")} className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border p-4 text-left ${delivery.emailEnabled ? "border-radar/30 bg-radar/5" : "border-slate-200 dark:border-midnight-border"}`}><div className="min-w-0"><p className="font-semibold">Email</p><p className="mt-1 text-xs text-slate-500">Detailed warning and dashboard link.</p></div>{delivery.emailEnabled && <CheckCircle2 className="h-5 w-5 shrink-0 text-radar" />}</button><button onClick={() => toggle("smsEnabled")} disabled={!delivery.phoneVerified} className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border p-4 text-left disabled:opacity-40 ${delivery.smsEnabled ? "border-radar/30 bg-radar/5" : "border-slate-200 dark:border-midnight-border"}`}><div className="min-w-0"><p className="font-semibold">SMS</p><p className="mt-1 text-xs text-slate-500">Short warning for basic phones.</p></div><MessageCircle className={`h-5 w-5 shrink-0 ${delivery.smsEnabled ? "text-radar" : "text-slate-400"}`} /></button><button onClick={() => toggle("whatsappEnabled")} disabled={!delivery.phoneVerified} className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border p-4 text-left disabled:opacity-40 ${delivery.whatsappEnabled ? "border-radar/30 bg-radar/5" : "border-slate-200 dark:border-midnight-border"}`}><div className="min-w-0"><p className="font-semibold">WhatsApp</p><p className="mt-1 text-xs text-slate-500">Rich mobile alert when connected.</p></div><MessageCircle className={`h-5 w-5 shrink-0 ${delivery.whatsappEnabled ? "text-radar" : "text-slate-400"}`} /></button><button onClick={() => toggle("voiceEnabled")} disabled={!delivery.phoneVerified} className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border p-4 text-left disabled:opacity-40 ${delivery.voiceEnabled ? "border-radar/30 bg-radar/5" : "border-slate-200 dark:border-midnight-border"}`}><div className="min-w-0"><p className="font-semibold">Voice call</p><p className="mt-1 text-xs text-slate-500">Useful when reading quickly is difficult.</p></div><Volume2 className={`h-5 w-5 shrink-0 ${delivery.voiceEnabled ? "text-radar" : "text-slate-400"}`} /></button></>}</div>
      {!delivery && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading settings…</div>}
    </div>
  </div>;
}
