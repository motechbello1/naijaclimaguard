/**
 * Command-line version of the demo loader (the founder page has a button too).
 * RUN ONLY AFTER the FloodPass migrations are applied:
 *   DATABASE_URL=... FLOODPASS_KEY_PEPPER=... npx tsx scripts/floodpass-seed-abuja.ts
 */
import { seedAbujaAugust2026 } from "@/lib/floodpass/seed-abuja";

seedAbujaAugust2026()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
