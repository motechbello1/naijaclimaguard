"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, Phone, ShieldCheck, Volume2 } from "lucide-react";

interface DeliveryState {
  phone: string | null;
  phoneMasked: string | null;
  phoneVerified: boolean;
  preferredLanguage: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  voiceEnabled: boolean;
}

const LANGUAGES = [
  ["ENGLISH", "English"],
  ["HAUSA", "Hausa"],
  ["YORUBA", "Yoruba"],
  ["IGBO", "Igbo"],
  ["PIDGIN", "Pidgin"],
] as const;

export default function DeliveryPreferencesCard() {
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
      setDelivery(data.delivery);
      setPhone(data.delivery.phone || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delivery settings unavailable.");
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (patch: Record<string, unknown>) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/profile/delivery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save delivery settings.");
      setDelivery(data.delivery);
      setPhone(data.delivery.phone || "");
      setMessage("Delivery settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save delivery settings.");
    } finally { setBusy(false); }
  };

  const requestCode = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      if (phone !== (delivery?.phone || "")) {
        const response = await fetch("/api/profile/delivery", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not save phone number.");
        setDelivery(data.delivery);
      }
      const response = await fetch("/api/profile/phone-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REQUEST" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send verification code.");
      setMessage("Verification code sent by SMS. It expires in 10 minutes.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification code.");
    } finally { setBusy(false); }
  };

  const verifyCode = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/profile/phone-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VERIFY", code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not verify phone number.");
      setCode("");
      setMessage("Phone verified. You can now enable phone-based flood alerts.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify phone number.");
    } finally { setBusy(false); }
  };

  const toggle = (key: "emailEnabled" | "smsEnabled" | "whatsappEnabled" | "voiceEnabled") => {
    if (!delivery) return;
    save({ [key]: !delivery[key] });
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-start gap-3">
        <Phone className="mt-0.5 h-5 w-5 text-radar" />
        <div>
          <h2 className="text-sm font-bold">How should we reach you?</h2>
          <p className="mt-1 text-sm text-slate-500">Choose the channels you can act on fastest during a flood warning.</p>
        </div>
      </div>

      {error && <div className="mt-4 rounded-lg border border-crimson/20 bg-crimson/5 px-4 py-3 text-sm text-crimson">{error}</div>}
      {message && <div className="mt-4 rounded-lg border border-radar/20 bg-radar/5 px-4 py-3 text-sm text-radar">{message}</div>}

      <div className="mt-5 space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Phone number</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803… or +234803…" className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm focus:border-radar focus:outline-none dark:border-midnight-border dark:bg-midnight" />
            <button onClick={requestCode} disabled={busy || !phone} className="rounded-lg border border-radar/30 px-4 py-3 text-sm font-semibold text-radar disabled:opacity-40">
              {busy ? "Please wait…" : delivery?.phoneVerified && phone === delivery.phone ? "Verified" : "Verify phone"}
            </button>
          </div>
          {delivery?.phoneVerified && phone === delivery.phone && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-radar"><ShieldCheck className="h-3.5 w-3.5" /> Verified for emergency delivery</p>
          )}
        </div>

        {!delivery?.phoneVerified && delivery?.phone && (
          <div className="rounded-xl border border-slate-200 p-4 dark:border-midnight-border">
            <p className="text-sm font-semibold">Enter the 6-digit SMS code</p>
            <div className="mt-2 flex gap-2">
              <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="w-40 rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-lg tracking-widest dark:border-midnight-border dark:bg-midnight" />
              <button onClick={verifyCode} disabled={busy || code.length !== 6} className="rounded-lg bg-radar px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Confirm</button>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Preferred alert language</label>
          <select value={delivery?.preferredLanguage || "ENGLISH"} onChange={(e) => save({ preferredLanguage: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-midnight-border dark:bg-midnight sm:w-64">
            {LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-500">
            We save this preference now. Safety-reviewed Hausa, Yoruba, Igbo and Pidgin emergency templates are still being prepared; until a reviewed template is installed, emergency messages use the approved English fallback rather than an unverified translation.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {delivery && (
            <>
              <button onClick={() => toggle("emailEnabled")} className={`flex items-center justify-between rounded-xl border p-4 text-left ${delivery.emailEnabled ? "border-radar/30 bg-radar/5" : "border-slate-200 dark:border-midnight-border"}`}>
                <div><p className="font-semibold">Email</p><p className="mt-1 text-xs text-slate-500">Detailed warning and link to your dashboard.</p></div>
                {delivery.emailEnabled && <CheckCircle2 className="h-5 w-5 text-radar" />}
              </button>
              <button onClick={() => toggle("smsEnabled")} disabled={!delivery.phoneVerified} className={`flex items-center justify-between rounded-xl border p-4 text-left disabled:opacity-40 ${delivery.smsEnabled ? "border-radar/30 bg-radar/5" : "border-slate-200 dark:border-midnight-border"}`}>
                <div><p className="font-semibold">SMS</p><p className="mt-1 text-xs text-slate-500">Short warning for basic phones and weak internet.</p></div>
                <MessageCircle className={`h-5 w-5 ${delivery.smsEnabled ? "text-radar" : "text-slate-400"}`} />
              </button>
              <button onClick={() => toggle("whatsappEnabled")} disabled={!delivery.phoneVerified} className={`flex items-center justify-between rounded-xl border p-4 text-left disabled:opacity-40 ${delivery.whatsappEnabled ? "border-radar/30 bg-radar/5" : "border-slate-200 dark:border-midnight-border"}`}>
                <div><p className="font-semibold">WhatsApp</p><p className="mt-1 text-xs text-slate-500">Rich mobile alert when a provider connection is configured.</p></div>
                <MessageCircle className={`h-5 w-5 ${delivery.whatsappEnabled ? "text-radar" : "text-slate-400"}`} />
              </button>
              <button onClick={() => toggle("voiceEnabled")} disabled={!delivery.phoneVerified} className={`flex items-center justify-between rounded-xl border p-4 text-left disabled:opacity-40 ${delivery.voiceEnabled ? "border-radar/30 bg-radar/5" : "border-slate-200 dark:border-midnight-border"}`}>
                <div><p className="font-semibold">Voice call</p><p className="mt-1 text-xs text-slate-500">Useful when reading a text quickly may be difficult.</p></div>
                <Volume2 className={`h-5 w-5 ${delivery.voiceEnabled ? "text-radar" : "text-slate-400"}`} />
              </button>
            </>
          )}
        </div>

        {!delivery && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading delivery settings…</div>}
      </div>
    </div>
  );
}
