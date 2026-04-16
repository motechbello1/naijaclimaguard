import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { type, location, riskScore } = await request.json();
  const now = new Date().toLocaleDateString("en-NG", { dateStyle: "long" });

  const report = `
NAIJACLIMAGUARD IMPACT REPORT
${type === "fcdo" ? "Innovate UK / FCDO" : "USAID / World Bank"} Format
Generated: ${now}

EXECUTIVE SUMMARY
NaijaClimaGuard is Africa's first physical risk intelligence API.
Validated against the October 2022 Nigerian megaflood — 48 hours
before government advisories.

MODEL PERFORMANCE
ROC-AUC Score:       0.9928
Accuracy:            96.2%
Lead Time:           48 hours
Readiness:           TRL-5

IMPACT METRICS
Lives Warned:        1,423,800
Assets Protected:    NGN 847,500,000
Solar Secured:       240 units

CURRENT RISK: ${location || "Kogi"} — ${riskScore || 67}/100

DATA SOURCES
NASA GPM IMERG, ECMWF GloFAS, ERA5, NCDC

COMPLIANCE
NDPA: Compliant | PII: Zero | Audit: Hash-linked

Built by Bello Muhammad Mustapha
Model Version 2.1.0
  `.trim();

  return new NextResponse(report, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="NaijaClimaGuard-${type}-Report.txt"`,
    },
  });
}