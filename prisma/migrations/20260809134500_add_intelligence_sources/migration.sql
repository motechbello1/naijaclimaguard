CREATE TYPE "IntelligenceSourceKind" AS ENUM ('SATELLITE', 'WEATHER', 'HYDROLOGICAL_MODEL', 'OFFICIAL_GAUGE', 'IOT_SENSOR', 'DAM_OPERATION', 'CITIZEN_REPORT', 'OFFICIAL_ADVISORY');
CREATE TYPE "ObservationQuality" AS ENUM ('GOOD', 'SUSPECT', 'STALE', 'MISSING', 'UNKNOWN');

CREATE TABLE "IntelligenceSource" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceKind" "IntelligenceSourceKind" NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "defaultFreshnessMinutes" INTEGER NOT NULL,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntelligenceSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntelligenceCredential" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "scopes" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "sourceId" TEXT NOT NULL,
  CONSTRAINT "IntelligenceCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntelligenceObservation" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "variable" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "unit" TEXT NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "locationName" TEXT,
  "state" TEXT,
  "country" TEXT,
  "qualityStatus" "ObservationQuality" NOT NULL DEFAULT 'UNKNOWN',
  "confidence" DOUBLE PRECISION,
  "flags" JSONB,
  "sourceVersion" TEXT,
  "externalRecordId" TEXT,
  "originalUnit" TEXT,
  "originalVariable" TEXT,
  "metadata" JSONB,
  "dedupeKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntelligenceObservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntelligenceSource_slug_key" ON "IntelligenceSource"("slug");
CREATE UNIQUE INDEX "IntelligenceCredential_keyHash_key" ON "IntelligenceCredential"("keyHash");
CREATE INDEX "IntelligenceCredential_sourceId_active_idx" ON "IntelligenceCredential"("sourceId", "active");
CREATE UNIQUE INDEX "IntelligenceObservation_dedupeKey_key" ON "IntelligenceObservation"("dedupeKey");
CREATE INDEX "IntelligenceObservation_sourceId_observedAt_idx" ON "IntelligenceObservation"("sourceId", "observedAt");
CREATE INDEX "IntelligenceObservation_variable_observedAt_idx" ON "IntelligenceObservation"("variable", "observedAt");
CREATE INDEX "IntelligenceObservation_latitude_longitude_observedAt_idx" ON "IntelligenceObservation"("latitude", "longitude", "observedAt");

ALTER TABLE "IntelligenceCredential"
  ADD CONSTRAINT "IntelligenceCredential_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "IntelligenceSource"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntelligenceObservation"
  ADD CONSTRAINT "IntelligenceObservation_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "IntelligenceSource"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
