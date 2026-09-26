-- FloodPass part 2: warnings, photos, paid plans, SMS/voice/USSD contacts and
-- Drain Heroes. ADDITIVE ONLY: new tables, and new nullable or defaulted
-- columns on the FloodPass tables from the previous migration. Nothing that
-- existed before FloodPass is touched.

ALTER TABLE "FloodReport" ADD COLUMN "locationSource" TEXT NOT NULL DEFAULT 'gps';

ALTER TABLE "FloodPassContact" ADD COLUMN "phone" TEXT;
ALTER TABLE "FloodPassContact" ADD COLUMN "lastInboundAt" TIMESTAMP(3);
ALTER TABLE "FloodPassContact" ADD COLUMN "locationSource" TEXT NOT NULL DEFAULT 'gps';
CREATE INDEX "FloodPassContact_phone_idx" ON "FloodPassContact"("phone");
CREATE INDEX "FloodPassContact_state_idx" ON "FloodPassContact"("state");

CREATE TABLE "FloodWarning" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "level" TEXT NOT NULL DEFAULT 'BE_CAREFUL',
    "hazard" TEXT NOT NULL,
    "placeLabel" TEXT NOT NULL,
    "window" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "action" TEXT NOT NULL,
    "avoid" TEXT,
    "areaType" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radiusKm" DOUBLE PRECISION,
    "state" TEXT,
    "createdBy" TEXT NOT NULL,
    "externalReportId" TEXT,
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FloodWarning_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarningDelivery" (
    "id" TEXT NOT NULL,
    "warningId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "writtenBy" TEXT NOT NULL DEFAULT 'template',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WarningDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FloodPhoto" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "reportId" TEXT,
    "drainId" TEXT,
    "sha256" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storage" TEXT NOT NULL,
    "storageKey" TEXT,
    "bytes" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleteAfter" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FloodPhoto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FloodPassSubscription" (
    "id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "reference" TEXT NOT NULL,
    "paystackCustomerCode" TEXT,
    "paystackSubscription" TEXT,
    "paystackEmailToken" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FloodPassSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FloodPassPayment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "event" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FloodPassPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WatchedPlace" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'HOME',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WatchedPlace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FloodPassWaitlist" (
    "id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FloodPassWaitlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AddressCheck" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "placeName" TEXT NOT NULL,
    "state" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "email" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "AddressCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Drain" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "placeName" TEXT NOT NULL,
    "state" TEXT,
    "status" TEXT NOT NULL DEFAULT 'BLOCKED',
    "reportedByKey" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "beforePhotoHash" TEXT,
    "cleanedByKey" TEXT,
    "cleanedAt" TIMESTAMP(3),
    "afterPhotoHash" TEXT,
    "aiCheck" JSONB,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    CONSTRAINT "Drain_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DrainConfirmation" (
    "id" TEXT NOT NULL,
    "drainId" TEXT NOT NULL,
    "reporterKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DrainConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HeroPoints" (
    "id" TEXT NOT NULL,
    "reporterKey" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "drainId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HeroPoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RewardPayout" (
    "id" TEXT NOT NULL,
    "reporterKey" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "amountNaira" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "provider" TEXT NOT NULL DEFAULT 'africastalking',
    "providerRef" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "RewardPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FloodWarning_externalReportId_key" ON "FloodWarning"("externalReportId");
CREATE INDEX "FloodWarning_status_createdAt_idx" ON "FloodWarning"("status", "createdAt");

CREATE UNIQUE INDEX "WarningDelivery_warningId_contactId_channel_key" ON "WarningDelivery"("warningId", "contactId", "channel");
CREATE INDEX "WarningDelivery_contactId_createdAt_idx" ON "WarningDelivery"("contactId", "createdAt");

CREATE INDEX "FloodPhoto_ownerKey_idx" ON "FloodPhoto"("ownerKey");
CREATE INDEX "FloodPhoto_reportId_idx" ON "FloodPhoto"("reportId");
CREATE INDEX "FloodPhoto_drainId_idx" ON "FloodPhoto"("drainId");
CREATE INDEX "FloodPhoto_deleteAfter_idx" ON "FloodPhoto"("deleteAfter");

CREATE UNIQUE INDEX "FloodPassSubscription_reference_key" ON "FloodPassSubscription"("reference");
CREATE INDEX "FloodPassSubscription_phone_status_idx" ON "FloodPassSubscription"("phone", "status");
CREATE INDEX "FloodPassSubscription_email_idx" ON "FloodPassSubscription"("email");

CREATE UNIQUE INDEX "FloodPassPayment_reference_key" ON "FloodPassPayment"("reference");

CREATE INDEX "WatchedPlace_latitude_longitude_idx" ON "WatchedPlace"("latitude", "longitude");
CREATE INDEX "WatchedPlace_state_idx" ON "WatchedPlace"("state");

CREATE UNIQUE INDEX "FamilyMember_contactId_phone_key" ON "FamilyMember"("contactId", "phone");

CREATE INDEX "FloodPassWaitlist_plan_createdAt_idx" ON "FloodPassWaitlist"("plan", "createdAt");

CREATE UNIQUE INDEX "AddressCheck_code_key" ON "AddressCheck"("code");
CREATE UNIQUE INDEX "AddressCheck_reference_key" ON "AddressCheck"("reference");

CREATE UNIQUE INDEX "Drain_code_key" ON "Drain"("code");
CREATE INDEX "Drain_status_reportedAt_idx" ON "Drain"("status", "reportedAt");
CREATE INDEX "Drain_latitude_longitude_idx" ON "Drain"("latitude", "longitude");
CREATE INDEX "Drain_state_idx" ON "Drain"("state");

CREATE UNIQUE INDEX "DrainConfirmation_drainId_reporterKey_key" ON "DrainConfirmation"("drainId", "reporterKey");

CREATE UNIQUE INDEX "HeroPoints_reporterKey_reason_drainId_key" ON "HeroPoints"("reporterKey", "reason", "drainId");
CREATE INDEX "HeroPoints_reporterKey_createdAt_idx" ON "HeroPoints"("reporterKey", "createdAt");

CREATE INDEX "RewardPayout_status_createdAt_idx" ON "RewardPayout"("status", "createdAt");
CREATE INDEX "RewardPayout_reporterKey_idx" ON "RewardPayout"("reporterKey");

ALTER TABLE "WarningDelivery" ADD CONSTRAINT "WarningDelivery_warningId_fkey" FOREIGN KEY ("warningId") REFERENCES "FloodWarning"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarningDelivery" ADD CONSTRAINT "WarningDelivery_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "FloodPassContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FloodPhoto" ADD CONSTRAINT "FloodPhoto_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FloodReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WatchedPlace" ADD CONSTRAINT "WatchedPlace_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "FloodPassContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "FloodPassContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DrainConfirmation" ADD CONSTRAINT "DrainConfirmation_drainId_fkey" FOREIGN KEY ("drainId") REFERENCES "Drain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same hardening as every other table: server-side Prisma only, no public API access.
ALTER TABLE "FloodWarning" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WarningDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FloodPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FloodPassSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FloodPassPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WatchedPlace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FamilyMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FloodPassWaitlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AddressCheck" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Drain" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DrainConfirmation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HeroPoints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RewardPayout" ENABLE ROW LEVEL SECURITY;
