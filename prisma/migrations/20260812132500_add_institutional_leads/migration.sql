CREATE TABLE "InstitutionalLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "organizationType" TEXT NOT NULL,
    "role" TEXT,
    "locations" TEXT,
    "objective" TEXT NOT NULL,
    "integrationNeeds" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'institutional-pilot',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionalLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InstitutionalLead_email_idx" ON "InstitutionalLead"("email");
CREATE INDEX "InstitutionalLead_createdAt_idx" ON "InstitutionalLead"("createdAt");
CREATE INDEX "InstitutionalLead_stage_createdAt_idx" ON "InstitutionalLead"("stage", "createdAt");

-- The public browser must never read institutional applications directly from
-- the Supabase REST surface. Server-side Prisma uses the database connection.
ALTER TABLE "InstitutionalLead" ENABLE ROW LEVEL SECURITY;
