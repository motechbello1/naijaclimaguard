import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ORGANIZATION_TYPES = new Set([
  "government",
  "bank-insurer",
  "telecom",
  "agribusiness-infrastructure",
  "ngo-research",
  "other",
]);

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (text(body.website, 200)) return NextResponse.json({ ok: true }, { status: 201 });

    const name = text(body.name, 120);
    const email = text(body.email, 180).toLowerCase();
    const organization = text(body.organization, 180);
    const organizationType = text(body.organizationType, 60);
    const role = text(body.role, 140) || null;
    const locations = text(body.locations, 500) || null;
    const objective = text(body.objective, 3000);
    const integrationNeeds = text(body.integrationNeeds, 2000) || null;
    const consent = body.consent === true;
    const source = text(body.source, 80) || "institutional-pilot";
    const productInterest = text(body.productInterest, 120) || null;

    if (name.length < 2 || organization.length < 2) return NextResponse.json({ error: "Please provide your name and organization." }, { status: 400 });
    if (!looksLikeEmail(email)) return NextResponse.json({ error: "Please provide a valid work email." }, { status: 400 });
    if (!ORGANIZATION_TYPES.has(organizationType)) return NextResponse.json({ error: "Please select an organization type." }, { status: 400 });
    if (objective.length < 20) return NextResponse.json({ error: "Please describe what you need in a little more detail." }, { status: 400 });
    if (!consent) return NextResponse.json({ error: "Consent is required so we can contact you about this request." }, { status: 400 });

    const recent = await prisma.institutionalLead.findFirst({
      where: { email, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (recent) return NextResponse.json({ ok: true, reference: recent.id.slice(-8).toUpperCase(), duplicate: true });

    const lead = await prisma.institutionalLead.create({
      data: {
        name,
        email,
        organization,
        organizationType,
        role,
        locations,
        objective,
        integrationNeeds,
        consent,
        source,
        metadata: {
          productInterest,
          modelEvidenceAtSubmission: "riverine-watch-v1",
          publicRiskEngineAtSubmission: "derived-v2",
          claimBoundary: "80% historical event detection = 4/5 eligible onset events in Lokoja + Makurdi retrospective testing",
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, reference: lead.id.slice(-8).toUpperCase() }, { status: 201 });
  } catch (error) {
    console.error("institutional lead intake failed", error);
    return NextResponse.json({ error: "We could not save the request right now. Please try again." }, { status: 500 });
  }
}
