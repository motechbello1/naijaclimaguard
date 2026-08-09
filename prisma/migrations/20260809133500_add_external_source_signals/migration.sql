CREATE TABLE "SourceDevice" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  CONSTRAINT "SourceDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalSignal" (
  "id" TEXT NOT NULL,
  "signalType" TEXT NOT NULL,
  "severity" TEXT,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "area" TEXT,
  "numericValue" DOUBLE PRECISION,
  "unit" TEXT,
  "sourceName" TEXT NOT NULL,
  "authority" TEXT,
  "deviceId" TEXT,
  "fingerprint" TEXT NOT NULL,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalSignal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SourceDevice_externalId_key" ON "SourceDevice"("externalId");
CREATE INDEX "SourceDevice_sourceType_status_idx" ON "SourceDevice"("sourceType", "status");
CREATE INDEX "SourceDevice_latitude_longitude_idx" ON "SourceDevice"("latitude", "longitude");

CREATE UNIQUE INDEX "ExternalSignal_fingerprint_key" ON "ExternalSignal"("fingerprint");
CREATE INDEX "ExternalSignal_signalType_observedAt_idx" ON "ExternalSignal"("signalType", "observedAt");
CREATE INDEX "ExternalSignal_deviceId_observedAt_idx" ON "ExternalSignal"("deviceId", "observedAt");
CREATE INDEX "ExternalSignal_latitude_longitude_observedAt_idx" ON "ExternalSignal"("latitude", "longitude", "observedAt");
CREATE INDEX "ExternalSignal_expiresAt_idx" ON "ExternalSignal"("expiresAt");

ALTER TABLE "ExternalSignal"
  ADD CONSTRAINT "ExternalSignal_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "SourceDevice"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
