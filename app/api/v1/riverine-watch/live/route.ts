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

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as RiverineWatchSourcePayload;
    const features = buildRiverineWatchFeatures(payload);
    const result = scoreRiverineWatchV1(features);

    const issueDate = new Date(`${payload.issue_date}T00:00:00Z`);
    const lastWatchDate = payload.last_watch_date
      ? new Date(`${payload.last_watch_date}T00:00:00Z`)
      : null;
    if (lastWatchDate && Number.isNaN(lastWatchDate.getTime())) {
      throw new Error("last_watch_date must be YYYY-MM-DD when supplied");
    }

    const emitWatch = shouldEmitRiverineWatch(
      result.state,
      issueDate,
      lastWatchDate,
      7
    );

    return NextResponse.json({
      ...result,
      issue_date: payload.issue_date,
      location: payload.location,
      emit_watch_episode: emitWatch,
      cooldown_days: 7,
      source_contract: {
        rainfall: "NASA IMERG Early daily rainfall; 30 complete prior days",
        river: "GloFAS operational control forecast discharge at +24/+48/+72 h",
        substitutions_allowed: false,
      },
      features,
      alert_payload: emitWatch
        ? {
            type: "RIVERINE_WATCH",
            location: payload.location,
            probability: result.probability,
            horizon_days: result.horizon_days,
            issued_at: payload.issue_date,
            message: `Riverine Watch: elevated flood-onset risk is indicated for ${payload.location} within the next 14 days. Continue official-source monitoring and preparedness actions.`,
            public_action_authorized: false,
          }
        : null,
      evidence_notice:
        "Retrospective shadow/pilot model. This endpoint is operationally runnable but is not yet prospectively validated for autonomous public warning issuance.",
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
