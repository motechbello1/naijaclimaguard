"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, ShieldCheck, Building2 } from "lucide-react";
import { ASSET_LABELS, AssetType, getActionGuidance } from "@/lib/action-guidance";
import { useExperienceProfile } from "@/components/shared/ExperienceProfile";
import { useExplanationMode } from "@/components/shared/ExplanationMode";

interface ActionCardProps {
  score: number;
  level: string;
  locationId: string;
  locationName: string;
  model?: string;
  threshold?: number;
}

const assetStorageKey = (locationId: string) => `naijaclimaguard.asset-profile.${locationId}`;

const isAssetType = (value: string | null): value is AssetType =>
  value !== null && Object.prototype.hasOwnProperty.call(ASSET_LABELS, value);

const roleDefaultAsset = {
  HOUSEHOLD: "HOME",
  FARMER: "FARM",
  BUSINESS: "BUSINESS_PREMISES",
  AGENCY: "GOVERNMENT_FACILITY",
} as const;

export default function ActionCard({
  score,
  level,
  locationId,
  locationName,
  model,
  threshold,
}: ActionCardProps) {
  const { role } = useExperienceProfile();
  const { mode } = useExplanationMode();
  const [assetType, setAssetType] = useState<AssetType>(roleDefaultAsset[role]);
  const [done, setDone] = useState<number[]>([]);
  const [recorded, setRecorded] = useState<number[]>([]);
  const [recording, setRecording] = useState<number[]>([]);

  useEffect(() => {
    const savedAsset = window.localStorage.getItem(assetStorageKey(locationId));
    if (isAssetType(savedAsset)) setAssetType(savedAsset);
    else setAssetType(roleDefaultAsset[role]);
  }, [locationId, role]);

  const changeAssetType = (next: AssetType) => {
    setAssetType(next);
    setDone([]);
    setRecorded([]);
    window.localStorage.setItem(assetStorageKey(locationId), next);
  };

  const guidance = useMemo(
    () => getActionGuidance({ score, level, role, locationName, assetType, model, threshold }),
    [score, level, role, locationName, assetType, model, threshold],
  );

  const explanation = mode === "simple" ? guidance.simple : mode === "technical" ? guidance.technical : guidance.detailed;
  const urgencyClass = guidance.urgency === "act"
    ? "border-crimson/30 bg-crimson/5"
    : guidance.urgency === "prepare"
      ? "border-amber/30 bg-amber/5"
      : "border-radar/20 bg-radar/5";

  const toggleAction = async (index: number, action: string) => {
    const complete = done.includes(index);
    if (complete) {
      setDone((current) => current.filter((item) => item !== index));
      return;
    }

    setDone((current) => [...current, index]);
    setRecording((current) => [...current, index]);

    try {
      const response = await fetch("/api/evidence/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "ACTION_ACKNOWLEDGED",
          locationId,
          riskScore: score,
          riskLevel: level,
          modelLabel: model || "current disclosed production engine",
          assetType,
          actionCode: `${role}:${assetType}:${index}`,
          actionText: action,
          deliveryState: "user_marked_done",
          metadata: { role, detailMode: mode },
        }),
      });

      if (response.ok) {
        setRecorded((current) => current.includes(index) ? current : [...current, index]);
      }
    } catch {
      // The checklist must remain usable if the optional evidence service is unavailable.
    } finally {
      setRecording((current) => current.filter((item) => item !== index));
    }
  };

  return (
    <section className={`rounded-2xl border p-5 ${urgencyClass}`} aria-label={`Recommended actions for ${locationName}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <div className="mb-1 flex items-center gap-2">
            {guidance.urgency === "act" ? <AlertTriangle className="h-5 w-5 text-crimson" /> : <ShieldCheck className="h-5 w-5 text-radar" />}
            <h3 className="font-display text-lg font-bold">{guidance.headline}</h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{explanation}</p>
        </div>
        <div>
          <label className="sr-only" htmlFor={`asset-${locationId}`}>What is at this place?</label>
          <select
            id={`asset-${locationId}`}
            value={assetType}
            onChange={(e) => changeAssetType(e.target.value as AssetType)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold dark:border-midnight-border dark:bg-midnight-light"
          >
            {(Object.keys(ASSET_LABELS) as AssetType[]).map((a) => <option key={a} value={a}>{ASSET_LABELS[a]}</option>)}
          </select>
        </div>
      </div>

      {mode !== "simple" && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2 text-xs text-slate-600 dark:border-midnight-border dark:bg-midnight-light/40 dark:text-slate-300">
          <Building2 className="h-4 w-4 text-radar" />
          <span><strong>Asset profile:</strong> {ASSET_LABELS[assetType]} at {locationName}. This profile changes recommended actions, not the flood score.</span>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {guidance.actions.map((action, index) => {
          const complete = done.includes(index);
          const isRecording = recording.includes(index);
          const isRecorded = recorded.includes(index);
          return (
            <button
              key={`${role}-${assetType}-${index}`}
              type="button"
              onClick={() => toggleAction(index, action)}
              className="flex w-full items-start gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-3 text-left transition-all hover:border-radar/30 dark:border-midnight-border dark:bg-midnight-light/60"
            >
              {complete ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-radar" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
              <span className="min-w-0 flex-1">
                <span className={`block text-sm leading-relaxed ${complete ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>{action}</span>
                {mode !== "simple" && complete && (
                  <span className="mt-1 block text-[10px] text-slate-400">
                    {isRecording ? "Recording evidence…" : isRecorded ? "Acknowledgement recorded in evidence history" : "Completed locally; evidence ledger unavailable"}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        {mode === "simple"
          ? "Tap an action when you have done it. Follow official emergency instructions when they are issued."
          : "Completed actions are appended to evidence history when the server ledger is available. Unchecking an item does not erase an earlier evidence event."}
      </p>
    </section>
  );
}
