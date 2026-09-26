-- FloodPass tables. ADDITIVE ONLY: creates five new tables and changes nothing
-- that already exists. Needs an explicit yes before it is applied to the
-- production database.

CREATE TABLE "FloodReport" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "reporterKey" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "placeName" TEXT,
    "state" TEXT,
    "depth" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "note" TEXT,
    "photoRef" TEXT,
    "photoTakenAt" TIMESTAMP(3),
    "photoLatitude" DOUBLE PRECISION,
    "photoLongitude" DOUBLE PRECISION,
    "photoHash" TEXT,
    "aiPhoto" JSONB,
    "rainfall24hMm" DOUBLE PRECISION,
    "language" TEXT NOT NULL DEFAULT 'en',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNCONFIRMED',
    "checks" JSONB,
    "engineVersion" TEXT,
    "seeded" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FloodReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FloodPass" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "reportId" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "state" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "depth" TEXT NOT NULL,
    "floodedAt" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "checksPassed" INTEGER NOT NULL,
    "checksTotal" INTEGER NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "previousHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "seeded" BOOLEAN NOT NULL DEFAULT false,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    CONSTRAINT "FloodPass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FloodPassPartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "apiKeyPrefix" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pricePerCheckKobo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FloodPassPartner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PassCheck" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "passId" TEXT,
    "partnerId" TEXT,
    "result" TEXT NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PassCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FloodPassContact" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "address" TEXT NOT NULL,
    "reporterKey" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "step" TEXT NOT NULL DEFAULT 'NEW',
    "consentAt" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "placeName" TEXT,
    "state" TEXT,
    "pendingReport" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FloodPassContact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FloodReport_latitude_longitude_idx" ON "FloodReport"("latitude", "longitude");
CREATE INDEX "FloodReport_reportedAt_idx" ON "FloodReport"("reportedAt");
CREATE INDEX "FloodReport_reporterKey_reportedAt_idx" ON "FloodReport"("reporterKey", "reportedAt");
CREATE INDEX "FloodReport_status_reportedAt_idx" ON "FloodReport"("status", "reportedAt");
CREATE INDEX "FloodReport_photoHash_idx" ON "FloodReport"("photoHash");

CREATE UNIQUE INDEX "FloodPass_code_key" ON "FloodPass"("code");
CREATE UNIQUE INDEX "FloodPass_sequence_key" ON "FloodPass"("sequence");
CREATE UNIQUE INDEX "FloodPass_reportId_key" ON "FloodPass"("reportId");
CREATE UNIQUE INDEX "FloodPass_hash_key" ON "FloodPass"("hash");
CREATE INDEX "FloodPass_state_floodedAt_idx" ON "FloodPass"("state", "floodedAt");
CREATE INDEX "FloodPass_latitude_longitude_idx" ON "FloodPass"("latitude", "longitude");

CREATE UNIQUE INDEX "FloodPassPartner_apiKeyPrefix_key" ON "FloodPassPartner"("apiKeyPrefix");
CREATE UNIQUE INDEX "FloodPassPartner_apiKeyHash_key" ON "FloodPassPartner"("apiKeyHash");

CREATE INDEX "PassCheck_partnerId_createdAt_idx" ON "PassCheck"("partnerId", "createdAt");
CREATE INDEX "PassCheck_code_createdAt_idx" ON "PassCheck"("code", "createdAt");

CREATE UNIQUE INDEX "FloodPassContact_address_key" ON "FloodPassContact"("address");
CREATE UNIQUE INDEX "FloodPassContact_reporterKey_key" ON "FloodPassContact"("reporterKey");
CREATE INDEX "FloodPassContact_latitude_longitude_idx" ON "FloodPassContact"("latitude", "longitude");

ALTER TABLE "FloodPass" ADD CONSTRAINT "FloodPass_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FloodReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PassCheck" ADD CONSTRAINT "PassCheck_passId_fkey" FOREIGN KEY ("passId") REFERENCES "FloodPass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PassCheck" ADD CONSTRAINT "PassCheck_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "FloodPassPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Same hardening as every other table: server-side Prisma only, no public API access.
ALTER TABLE "FloodReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FloodPass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FloodPassPartner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PassCheck" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FloodPassContact" ENABLE ROW LEVEL SECURITY;
