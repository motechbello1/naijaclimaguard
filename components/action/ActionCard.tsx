"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ShieldCheck, Building2, ArrowDown } from "lucide-react";
import { ASSET_LABELS, AssetType, getActionGuidance } from "@/lib/action-guidance";
import { localizeActionGuidance } from "@/lib/action-guidance-i18n";
import { useExperienceProfile } from "@/components/shared/ExperienceProfile";
import { useExplanationMode } from "@/components/shared/ExplanationMode";
import { useLanguage } from "@/components/shared/LanguageProvider";
import ReadSectionButton from "@/components/shared/ReadSectionButton";

interface ActionCardProps {
  score: number;
  level: string;
  locationId: string;
  locationName: string;
  model?: string;
  threshold?: number;
}

const assetStorageKey = (locationId: string) => `naijaclimaguard.asset-profile.${locationId}`;
const isAssetType = (value: string | null): value is AssetType => value !== null && Object.prototype.hasOwnProperty.call(ASSET_LABELS, value);
const roleDefaultAsset = { HOUSEHOLD: "HOME", FARMER: "FARM", BUSINESS: "BUSINESS_PREMISES", AGENCY: "GOVERNMENT_FACILITY" } as const;

export default function ActionCard({ score, level, locationId, locationName, model, threshold }: ActionCardProps) {
  const { role } = useExperienceProfile();
  const { mode } = useExplanationMode();
  const { locale } = useLanguage();
  const [assetType, setAssetType] = useState<AssetType>(roleDefaultAsset[role]);
  const [done, setDone] = useState<number[]>([]);
  const [recorded, setRecorded] = useState<number[]>([]);
  const [recording, setRecording] = useState<number[]>([]);
  const readTarget = `action-read-${locationId}`;

  useEffect(() => {
    const savedAsset = window.localStorage.getItem(assetStorageKey(locationId));
    setAssetType(isAssetType(savedAsset) ? savedAsset : roleDefaultAsset[role]);
  }, [locationId, role]);

  const changeAssetType = (next: AssetType) => {
    setAssetType(next); setDone([]); setRecorded([]);
    window.localStorage.setItem(assetStorageKey(locationId), next);
  };

  const guidance = useMemo(() => {
    const input = { score, level, role, locationName, assetType, model, threshold };
    return localizeActionGuidance(getActionGuidance(input), input, locale);
  }, [score, level, role, locationName, assetType, model, threshold, locale]);

  const explanation = mode === "simple" ? guidance.simple : mode === "technical" ? guidance.technical : guidance.detailed;
  const tone = guidance.urgency === "act"
    ? { surface: "bg-[#fff1e9] dark:bg-[#2b1712]", accent: "#df5b36", wash: "bg-[#f9cdbf]", chip: "bg-[#df5b36] text-white" }
    : guidance.urgency === "prepare"
      ? { surface: "bg-[#fff8e8] dark:bg-[#251f11]", accent: "#d8a42a", wash: "bg-[#f7e3a4]", chip: "bg-[#f2d56b] text-[#4b3900]" }
      : { surface: "bg-[#edf8f2] dark:bg-[#0e241b]", accent: "#48ae7f", wash: "bg-[#bfe8d3]", chip: "bg-[#bfe8d3] text-[#0c5c3d]" };

  const toggleAction = async (index: number, action: string) => {
    const complete = done.includes(index);
    if (complete) { setDone((current) => current.filter((item) => item !== index)); return; }
    setDone((current) => [...current, index]);
    setRecording((current) => [...current, index]);
    try {
      const response = await fetch("/api/evidence/events", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "ACTION_ACKNOWLEDGED", locationId, riskScore: score, riskLevel: level, modelLabel: model || "current disclosed production engine", assetType, actionCode: `${role}:${assetType}:${index}`, actionText: action, deliveryState: "user_marked_done", metadata: { role, detailMode: mode, locale } }),
      });
      if (response.ok) setRecorded((current) => current.includes(index) ? current : [...current, index]);
    } catch { /* local checklist remains usable */ }
    finally { setRecording((current) => current.filter((item) => item !== index)); }
  };

  const simpleFooter = locale === "pcm" ? "Tap any step after you don do am. If official emergency instruction come, follow am first."
    : locale === "ha" ? "Danna kowane mataki idan ka gama shi. Idan umarnin gaggawa na hukuma ya zo, bi shi da farko."
    : locale === "yo" ? "Tẹ ìgbésẹ̀ kọọkan tí o bá ti ṣe e. Bí ìtọ́sọ́nà pajawiri ìjọba bá dé, tẹ̀lé e kọ́kọ́."
    : locale === "ig" ? "Pịa nzọụkwụ ọ bụla ma i mechaa ya. Ọ bụrụ na official emergency instruction bịara, soro ya mbụ."
    : "Tap each step after you do it. If an official emergency instruction is issued, follow it first.";

  const protectLabel = locale === "pcm" ? "I dey protect" : locale === "ha" ? "Abin da nake karewa" : locale === "yo" ? "Ohun tí mo ń dáàbò bo" : locale === "ig" ? "Ihe m na-echebe" : "I am protecting";
  const stepLabel = locale === "pcm" ? "Your next moves" : locale === "ha" ? "Matakan da za ka ɗauka" : locale === "yo" ? "Àwọn ìgbésẹ̀ rẹ" : locale === "ig" ? "Nzọụkwụ gị" : "Your next moves";

  return (
    <section id={readTarget} className={`relative overflow-hidden rounded-[34px] ${tone.surface}`} aria-label={`Recommended actions for ${locationName}`} data-read-aloud>
      <div className={`pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full ${tone.wash} opacity-35 blur-2xl`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-[.16]" style={{ backgroundImage: `repeating-radial-gradient(ellipse at 100% -20%, transparent 0 18px, ${tone.accent} 19px 20px, transparent 21px 38px)` }} />
      <div className="relative px-5 pb-5 pt-5 sm:px-7 sm:pb-7 sm:pt-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/75 shadow-[0_8px_24px_rgba(10,35,25,.08)] dark:bg-white/[.06]" style={{ color: tone.accent }}>
              {guidance.urgency === "act" ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.15em] ${tone.chip}`}>{level}</span>
                <span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500/80 dark:text-white/45">{locationName}</span>
              </div>
              <h3 className="mt-2 max-w-2xl font-display text-[clamp(1.65rem,5vw,2.75rem)] font-black leading-[1.02] tracking-[-.055em]">{guidance.headline}</h3>
            </div>
          </div>
          <ReadSectionButton targetId={readTarget} compact className="shrink-0" />
        </div>

        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 dark:text-white/68">{explanation}</p>

        <div className="mt-6 grid gap-4 border-y border-black/8 py-4 dark:border-white/9 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500 dark:text-white/40">{protectLabel}</p>
            <select id={`asset-${locationId}`} value={assetType} onChange={(e) => changeAssetType(e.target.value as AssetType)} className="mt-2 min-h-11 w-full max-w-[290px] rounded-full border border-black/10 bg-white/80 px-4 text-sm font-extrabold outline-none dark:border-white/10 dark:bg-white/[.06]">
              {(Object.keys(ASSET_LABELS) as AssetType[]).map((a) => <option key={a} value={a}>{ASSET_LABELS[a]}</option>)}
            </select>
          </div>
          {mode !== "simple" && <div className="hidden max-w-[260px] items-center gap-2 text-[11px] leading-5 text-slate-500 dark:text-white/40 sm:flex"><Building2 className="h-4 w-4 shrink-0" /> Actions adapt to asset type, not the score</div>}
        </div>

        <div className="mt-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-500 dark:text-white/42"><ArrowDown className="h-3.5 w-3.5" /> {stepLabel}</div>
        <ol className="mt-1">
          {guidance.actions.map((action, index) => {
            const complete = done.includes(index); const isRecording = recording.includes(index); const isRecorded = recorded.includes(index);
            return (
              <li key={`${role}-${assetType}-${index}`} className="border-b border-black/7 last:border-b-0 dark:border-white/8">
                <button type="button" onClick={() => toggleAction(index, action)} className="group flex w-full items-start gap-4 py-4 text-left sm:py-5">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition ${complete ? "bg-[#168760] text-white" : "bg-white/70 text-slate-600 ring-1 ring-black/9 group-hover:ring-emerald-600/35 dark:bg-white/[.05] dark:text-white/70 dark:ring-white/10"}`}>{complete ? <Check className="h-4 w-4" /> : index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[16px] font-extrabold leading-7 tracking-[-.015em] sm:text-[17px] ${complete ? "text-slate-400 line-through" : "text-slate-700 dark:text-white/86"}`}>{action}</span>
                    {mode !== "simple" && complete && <span className="mt-1 block text-[10px] text-slate-400">{isRecording ? "Recording evidence…" : isRecorded ? "Saved to evidence history" : "Completed on this device"}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-[11px] leading-5 text-slate-500 dark:text-white/42">{mode === "simple" ? simpleFooter : "Completed actions are recorded when the evidence service is available. Official emergency instructions always take priority."}</p>
          <ReadSectionButton targetId={readTarget} label={locale === "pcm" ? "Hear these steps" : locale === "ha" ? "Saurari matakan" : locale === "yo" ? "Gbọ́ àwọn ìgbésẹ̀" : locale === "ig" ? "Gee nzọụkwụ ndị a" : "Listen to these steps"} />
        </div>
      </div>
    </section>
  );
}
