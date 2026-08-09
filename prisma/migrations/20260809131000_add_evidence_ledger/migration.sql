-- CreateTable
CREATE TABLE "EvidenceEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "locationId" TEXT,
    "riskScore" DOUBLE PRECISION,
    "riskLevel" TEXT,
    "modelLabel" TEXT,
    "assetType" TEXT,
    "actionCode" TEXT,
    "actionText" TEXT,
    "channel" TEXT,
    "deliveryState" TEXT,
    "previousHash" TEXT,
    "eventHash" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "EvidenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceEvent_eventHash_key" ON "EvidenceEvent"("eventHash");
CREATE INDEX "EvidenceEvent_userId_occurredAt_idx" ON "EvidenceEvent"("userId", "occurredAt");
CREATE INDEX "EvidenceEvent_locationId_occurredAt_idx" ON "EvidenceEvent"("locationId", "occurredAt");
CREATE INDEX "EvidenceEvent_eventType_occurredAt_idx" ON "EvidenceEvent"("eventType", "occurredAt");

-- AddForeignKey
ALTER TABLE "EvidenceEvent" ADD CONSTRAINT "EvidenceEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvidenceEvent" ADD CONSTRAINT "EvidenceEvent_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
