CREATE TABLE "AgencyCommandCase" (
  "id" TEXT NOT NULL,
  "observationId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "acknowledgedAt" TIMESTAMP(3),
  "escalatedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  CONSTRAINT "AgencyCommandCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgencyCommandCase_observationId_key" ON "AgencyCommandCase"("observationId");
CREATE INDEX "AgencyCommandCase_status_updatedAt_idx" ON "AgencyCommandCase"("status", "updatedAt");
CREATE INDEX "AgencyCommandCase_priority_updatedAt_idx" ON "AgencyCommandCase"("priority", "updatedAt");

ALTER TABLE "AgencyCommandCase"
  ADD CONSTRAINT "AgencyCommandCase_observationId_fkey"
  FOREIGN KEY ("observationId") REFERENCES "IntelligenceObservation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgencyCommandCase"
  ADD CONSTRAINT "AgencyCommandCase_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
