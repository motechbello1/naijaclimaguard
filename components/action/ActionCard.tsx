"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ShieldCheck, Building2 } from "lucide-react";
import { ASSET_LABELS, AssetType, getActionGuidance } from "@/lib/action-guidance";
import { localizeActionGuidance } from "@/lib/action-guidance-i18n";
import { useExperienceProfile } from "@/components/shared/ExperienceProfile";
import { useExplanationMode } from "@/components/shared/ExplanationMode";
import { useLanguage } from "@/components/shared/LanguageProvider";

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
    ? { bg: "bg-[#fff4ef] dark:bg-[#2b1712]", line: "bg-[#e65e36]", icon: "text-[#d64d2c]", chip: "bg-[#ffe3d8] text-[#9d3219] dark:bg-[#6b2f21]/50 dark:text-[#ffc2b0]" }
    : guidance.urgency === "prepare"
      ? { bg: "bg-[#fff9ec] dark:bg-[#251f11]", line: "bg-[#dfa827]", icon: "text-[#b78311]", chip: "bg-[#fff0bd] text-[#755300] dark:bg-[#6a5216]/45 dark:text-[#ffe092]" }
      : { bg: "bg-[#eff8f3] dark:bg-[#0e241b]", line: "bg-[#56bd8d]", icon: "text-[#168760]", chip: "bg-[#dff3e8] text-[#126847] dark:bg-[#174f39]/45 dark:text-[#b7f3d4]" };

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

  const simpleFooter = locale === "pcm" ? "Tap action when you don do am. Follow official emergency instruction if dem issue am."
    : locale === "ha" ? "Danna mataki idan ka gama shi. Bi umarnin gaggawa na hukuma idan an bayar."
    : locale === "yo" ? "Tẹ ìgbésẹ̀ tí o bá ti ṣe e. Tẹ̀lé ìtọ́sọ́nà pajawiri ìjọba tí a bá fi sílẹ̀."
    : locale === "ig" ? "Pịa action ma i mechaa ya. Soro official emergency instruction ma e nye ya."
    : "Tap an action when you have done it. Follow official emergency instructions when they are issued.";

  return (
    <section className={`relative overflow-hidden rounded-[24px] ${tone.bg}`} aria-label={`Recommended actions for ${locationName}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${tone.line}`} />
      <div className="px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-sm dark:bg-white/5 ${tone.icon}`}>{guidance.urgency === "act" ? <AlertTriangle className="h-[18px] w-[18px]" /> : <ShieldCheck className="h-[18px] w-[18px]" />}</div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black leading-tight tracking-[-.03em] sm:text-2xl">{guidance.headline}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] ${tone.chip}`}>{level}</span></div><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-white/65">{explanation}</p></div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-y border-black/6 py-3 dark:border-white/8">
          <span className="text-xs font-bold text-slate-500 dark:text-white/45">Protecting</span>
          <select id={`asset-${locationId}`} value={assetType} onChange={(e) => changeAssetType(e.target.value as AssetType)} className="rounded-full border border-black/8 bg-white/80 px-3 py-2 text-xs font-bold outline-none dark:border-white/10 dark:bg-white/[.06]">
            {(Object.keys(ASSET_LABELS) as AssetType[]).map((a) => <option key={a} value={a}>{ASSET_LABELS[a]}</option>)}
          </select>
          {mode !== "simple" && <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-slate-500 dark:text-white/40 sm:flex"><Building2 className="h-3.5 w-3.5" /> Actions adapt to asset type, not the score</span>}
        </div>
      </div>

      <div className="px-5 pb-4 sm:px-6 sm:pb-5">
        <ol className="divide-y divide-black/7 dark:divide-white/8">
          {guidance.actions.map((action, index) => {
            const complete = done.includes(index); const isRecording = recording.includes(index); const isRecorded = recorded.includes(index);
            return <li key={`${role}-${assetType}-${index}`}><button type="button" onClick={() => toggleAction(index, action)} className="group flex w-full items-start gap-3 py-4 text-left"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-black transition ${complete ? "border-[#168760] bg-[#168760] text-white" : "border-black/12 bg-white/65 text-slate-500 group-hover:border-[#168760] dark:border-white/14 dark:bg-white/[.04]"}`}>{complete ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className="min-w-0 flex-1"><span className={`block text-[15px] font-semibold leading-6 ${complete ? "text-slate-400 line-through" : "text-slate-700 dark:text-white/82"}`}>{action}</span>{mode !== "simple" && complete && <span className="mt-1 block text-[10px] text-slate-400">{isRecording ? "Recording evidence…" : isRecorded ? "Saved to evidence history" : "Completed on this device"}</span>}</span></button></li>;
          })}
        </ol>
        <p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-white/38">{mode === "simple" ? simpleFooter : "Completed actions are recorded when the evidence service is available. Official emergency instructions always take priority."}</p>
      </div>
    </section>
  );
}
