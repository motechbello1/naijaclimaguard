-- Prisma-safe Supabase hardening.
-- The application accesses PostgreSQL server-side through Prisma using DATABASE_URL/DIRECT_URL.
-- No client-side Supabase/PostgREST policies are granted here; anon/authenticated roles therefore
-- cannot read or mutate application tables, while the server-side postgres role retains BYPASSRLS.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvidenceEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntelligenceSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntelligenceCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntelligenceObservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgencyCommandCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeliveryPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PhoneVerificationChallenge" ENABLE ROW LEVEL SECURITY;
