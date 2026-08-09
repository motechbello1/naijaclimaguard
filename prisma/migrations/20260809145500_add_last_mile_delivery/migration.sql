CREATE TABLE "DeliveryPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "phoneE164" TEXT,
  "phoneVerifiedAt" TIMESTAMP(3),
  "preferredLanguage" TEXT NOT NULL DEFAULT 'ENGLISH',
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
  "voiceEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhoneVerificationChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "phoneE164" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneVerificationChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryPreference_userId_key" ON "DeliveryPreference"("userId");
CREATE INDEX "DeliveryPreference_phoneE164_idx" ON "DeliveryPreference"("phoneE164");
CREATE INDEX "PhoneVerificationChallenge_userId_createdAt_idx" ON "PhoneVerificationChallenge"("userId", "createdAt");
CREATE INDEX "PhoneVerificationChallenge_phoneE164_createdAt_idx" ON "PhoneVerificationChallenge"("phoneE164", "createdAt");
CREATE INDEX "PhoneVerificationChallenge_expiresAt_idx" ON "PhoneVerificationChallenge"("expiresAt");

ALTER TABLE "DeliveryPreference"
  ADD CONSTRAINT "DeliveryPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PhoneVerificationChallenge"
  ADD CONSTRAINT "PhoneVerificationChallenge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
