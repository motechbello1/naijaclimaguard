import fs from "node:fs";

const init = fs.readFileSync("app/api/payment/initialize/route.ts", "utf8");
const verify = fs.readFileSync("app/api/payment/verify/route.ts", "utf8");

function requireText(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}

function forbidText(source, needle, message) {
  if (source.includes(needle)) throw new Error(message);
}

requireText(init, "getServerSession(authOptions)", "Checkout must be bound to an authenticated session.");
requireText(init, 'plan !== "professional"', "Public checkout must reject non-Professional plans.");
requireText(init, "account_user_id: user.id", "Checkout metadata must bind the Paystack transaction to the account user ID.");
requireText(init, "account_email: user.email.toLowerCase()", "Checkout metadata must bind the transaction to the account email.");
requireText(init, "expected_amount_kobo: PROFESSIONAL_AMOUNT_KOBO", "Checkout metadata must commit to the expected amount.");
requireText(init, 'currency: "NGN"', "Public checkout currency must be NGN.");

requireText(verify, "Number(tx.amount) === PROFESSIONAL_AMOUNT_KOBO", "Verification must compare the settled amount to the expected Professional price.");
requireText(verify, 'String(tx.currency || "").toUpperCase() === "NGN"', "Verification must enforce NGN currency.");
requireText(verify, 'metadata.plan === "professional"', "Verification must enforce the Professional product entitlement.");
requireText(verify, "customerEmail === expectedEmail", "Verification must bind Paystack customer email to checkout metadata.");
requireText(verify, "where: { id: accountUserId, email: expectedEmail }", "Verification must bind the entitlement to the exact platform account.");
requireText(verify, 'data: { plan: "PROFESSIONAL" }', "Public checkout must grant Professional only.");
requireText(verify, 'user.plan === "ENTERPRISE"', "Existing Enterprise accounts must be protected from public checkout changes.");

forbidText(verify, 'data: { plan: "ENTERPRISE" }', "Public payment verification must never grant Enterprise.");
forbidText(verify, '? "PROFESSIONAL" : "ENTERPRISE"', "Public payment verification must never derive Enterprise from arbitrary metadata.");

console.log("Payment entitlement contract OK: authenticated Professional-only checkout, exact amount/currency/account verification, no Enterprise grant path.");
