export const COMMERCIAL_PRODUCTS = {
  family_plus_annual: {
    code: "family_plus_annual",
    name: "Family Plus",
    amountKobo: 1_200_000,
    currency: "NGN",
    kind: "plan",
    plan: "PROFESSIONAL",
    credits: 0,
    summary: "10 protected locations, family sharing, richer history and priority delivery options for one year.",
  },
  business_starter_annual: {
    code: "business_starter_annual",
    name: "Business Starter",
    amountKobo: 12_000_000,
    currency: "NGN",
    kind: "plan",
    plan: "BUSINESS_STARTER",
    credits: 0,
    summary: "25 monitored locations, 5 seats, evidence exports and portfolio monitoring for one year.",
  },
  api_10000: {
    code: "api_10000",
    name: "API Starter 10,000",
    amountKobo: 5_000_000,
    currency: "NGN",
    kind: "credits",
    plan: null,
    credits: 10_000,
    summary: "10,000 prepaid NaijaClimaGuard API credits.",
  },
  api_100000: {
    code: "api_100000",
    name: "API Growth 100,000",
    amountKobo: 35_000_000,
    currency: "NGN",
    kind: "credits",
    plan: null,
    credits: 100_000,
    summary: "100,000 prepaid NaijaClimaGuard API credits at a lower effective unit cost.",
  },
} as const;

export type CommercialProductCode = keyof typeof COMMERCIAL_PRODUCTS;

export function commercialProduct(code: unknown) {
  const key = String(code || "") as CommercialProductCode;
  return COMMERCIAL_PRODUCTS[key] || null;
}
