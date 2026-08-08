import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/alerts/check
 * Threshold alert engine using the current disclosed derived risk formula.
 *
 * Email can be delivered through Resend when configured. SMS remains disabled
 * until the user model stores a real phone number; an email address must never
 * be passed to Termii as a destination number.
 */

function deriveScore(daily: any): number {
  const idx = daily.time.length - 5;
  const p: number[] = daily.precipitation_sum ?? [];
  const et0: number[] = daily.et0_fao_evapotranspiration ?? [];
  const sum = (a: number[], x: number, y: number) =>
    a.slice(Math.max(0, x), y).reduce((m, n) => m + (n || 0), 0);
  const rain7 = sum(p, idx - 6, idx + 1);
  const rain3 = sum(p, idx - 2, idx + 1);
  const bal7 = rain7 - sum(et0, idx - 6, idx + 1);
  return Math.round(
    (Math.min(1, rain7 / 200) * 0.45 +
      Math.min(1, rain3 / 120) * 0.3 +
      Math.min(1, Math.max(0, (bal7 + 40) / 160)) * 0.25) * 100
  );
}

async function sendEmail(to: string, locationName: string, score: number, threshold: number) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "email_pending_credential";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ALERT_FROM_EMAIL ?? "NaijaClimaGuard <onboarding@resend.dev>",
        to: [to],
        subject: `Flood-risk threshold crossed at ${locationName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px">
            <h2 style="color:#EF4444">Flood-Risk Alert — ${locationName}</h2>
            <p>The current NaijaClimaGuard risk index is <strong>${score}/100</strong>, crossing your configured threshold of ${threshold}.</p>
            <p style="color:#555">This index is calculated from current Open-Meteo precipitation and evapotranspiration context using the disclosed live heuristic model.</p>
            <p><a href="https://naijaclimaguard.vercel.app/my-area" style="color:#10B981;font-weight:bold">Open NaijaClimaGuard →</a></p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
            <p style="font-size:12px;color:#999">Decision-support signal only. Follow official NiHSA, NiMet, NEMA, SEMA, and local emergency guidance where applicable.</p>
          </div>`,
      }),
    });
    return res.ok ? "email_sent" : "email_failed";
  } catch {
    return "email_failed";
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { alerts: { where: { active: true }, include: { location: true } } },
  });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 401 });

  const results: any[] = [];
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  for (const alert of user.alerts) {
    const { location } = alert;
    let score: number | null = null;
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}` +
          `&daily=precipitation_sum,et0_fao_evapotranspiration&past_days=10&forecast_days=4&timezone=Africa%2FLagos`,
        { cache: "no-store" }
      );
      if (res.ok) score = deriveScore((await res.json()).daily);
    } catch {}

    if (score === null) {
      results.push({ location: location.name, status: "feed_unreachable" });
      continue;
    }

    const crossed = score >= alert.threshold;
    const recentlyNotified = alert.lastNotifiedAt && alert.lastNotifiedAt > twelveHoursAgo;

    if (crossed && !recentlyNotified) {
      const emailStatus = await sendEmail(user.email, location.name, score, alert.threshold);
      const smsStatus = "sms_disabled_phone_not_collected";
      await prisma.alert.update({
        where: { id: alert.id },
        data: { lastNotifiedAt: new Date() },
      });
      results.push({ location: location.name, score, threshold: alert.threshold, status: "triggered", emailStatus, smsStatus });
    } else {
      results.push({
        location: location.name,
        score,
        threshold: alert.threshold,
        status: crossed ? "already_notified" : "below_threshold",
      });
    }
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    channels: {
      email: process.env.RESEND_API_KEY ? "live" : "pending_credential",
      sms: "integration_pending_phone_field",
    },
    model: "derived daily rainfall / antecedent-wetness threshold index",
    results,
  });
}
