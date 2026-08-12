import { NextRequest, NextResponse } from "next/server";
import {
  buildRiverineWatchFeatures,
  type RiverineWatchSourcePayload,
} from "@/lib/risk/riverine-watch-features";
import {
  scoreRiverineWatchV1,
  shouldEmitRiverineWatch,
} from "@/lib/risk/riverine-watch-v1";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const MAX_SOURCE_AGE_DAYS = 2;
const MAX_LIVE_EMIT_AGE_DAYS = 1;

function utcDate(value: string, name: string) {
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`${name} must be YYYY-MM-DD`);
  return d;
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as RiverineWatchSourcePayload;
    const issueDate = utcDate(payload.issue_date, "issue_date");
    const operationalDate = utcDate(
      payload.operational_date ?? payload.issue_date,
      "operational_date"
    );
    const sourceAgeDays = Math.round(
      (operationalDate.getTime() - issueDate.getTime()) / DAY_MS
    );
    if (sourceAgeDays < 0) {
      throw new Error("operational_date cannot precede the selected GloFAS issue_date");
    }
    if (sourceAgeDays > MAX_SOURCE_AGE_DAYS) {
      return NextResponse.json(
        {
          model_id: "riverine-watch-v1",
          status: "SOURCE_DELAYED",
          issue_date: payload.issue_date,
          operational_date: payload.operational_date ?? payload.issue_date,
          source_age_days: sourceAgeDays,
          score_issued: false,
          emit_watch_episode: false,
          public_action_authorized: false,
          message:
            "The latest supplied GloFAS issue is too old for Riverine Watch v1. No new shadow watch is issued.",
        },
        { status: 409 }
      );
    }

    const features = buildRiverineWatchFeatures(payload);
    const result = scoreRiverineWatchV1(features);

    const lastWatchDate = payload.last_watch_date
      ? utcDate(payload.last_watch_date, "last_watch_date")
      : null;
    const eligibleForLiveShadow = sourceAgeDays <= MAX_LIVE_EMIT_AGE_DAYS;
    const emitWatch = eligibleForLiveShadow && shouldEmitRiverineWatch(
      result.state,
      issueDate,
      lastWatchDate,
      7
    );

    const issuanceClass = sourceAgeDays === 0
      ? "fresh_live_shadow"
      : sourceAgeDays === 1
        ? "delayed_1d_live_shadow"
        : "delayed_2d_backfill_only";

    return NextResponse.json({
      ...result,
      issue_date: payload.issue_date,
      operational_date: payload.operational_date ?? payload.issue_date,
      location: payload.location,
      source_age_days: sourceAgeDays,
      issuance_class: issuanceClass,
      eligible_for_live_shadow_metrics: eligibleForLiveShadow,
      emit_watch_episode: emitWatch,
      cooldown_days: 7,
      source_contract: {
        rainfall:
          "NASA IMERG Early daily rainfall; exactly 30 complete days before the selected GloFAS issue date",
        river:
          "GloFAS operational LISFLOOD control forecast discharge at +24/+48/+72 h",
        max_live_emit_age_days: MAX_LIVE_EMIT_AGE_DAYS,
        max_source_age_days: MAX_SOURCE_AGE_DAYS,
        substitutions_allowed: false,
      },
      features,
      alert_payload: emitWatch
        ? {
            type: "RIVERINE_WATCH",
            location: payload.location,
            probability: result.probability,
            horizon_days: result.horizon_days,
            model_issue_date: payload.issue_date,
            operational_date: payload.operational_date ?? payload.issue_date,
            source_age_days: sourceAgeDays,
            message: `Riverine Watch: elevated flood-onset risk is indicated for ${payload.location}. This is a shadow/pilot signal requiring human review.`,
            public_action_authorized: false,
          }
        : null,
      evidence_notice:
        sourceAgeDays === 2
          ? "Two-day-old GloFAS issue: scored only as delayed backfill; no new WATCH episode can be emitted."
          : "Prospective shadow/pilot model. Human review is required; autonomous public warning issuance is not authorized.",
      public_action_authorized: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to build or score Riverine Watch v1",
      },
      { status: 400 }
    );
  }
}
