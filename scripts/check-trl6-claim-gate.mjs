import fs from "node:fs";
import path from "node:path";

const registerPath = path.join(process.cwd(), "validation/TRL6_EVIDENCE_REGISTER.json");
const register = JSON.parse(fs.readFileSync(registerPath, "utf8"));
const incomplete = register.gates.filter((gate) => gate.status !== "VERIFIED" || !gate.evidence_reference);

console.log(`NaijaClimaGuard claim status: ${register.current_claim_status}`);
console.log(`Evidence register updated: ${register.updated_on}`);

if (incomplete.length) {
  console.error("\nTRL6 claim blocked. The following evidence gates are not verified:");
  for (const gate of incomplete) {
    console.error(`- ${gate.id}: ${gate.status}`);
  }
  console.error("\nThis failure is intentional. Complete and independently review the evidence before changing the public claim.");
  process.exit(1);
}

if (register.current_claim_status !== "TRL6_VERIFIED") {
  console.error("\nAll evidence rows are present, but the independent promotion decision is not TRL6_VERIFIED.");
  process.exit(1);
}

console.log("\nTRL6 claim gate passed. All required evidence is verified and the promotion decision is recorded.");
