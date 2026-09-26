import type { Metadata } from "next";
import PartnerScreen from "@/components/floodpass/PartnerScreen";

export const metadata: Metadata = { title: "For organisations | NaijaClimaGuard", description: "Scope a measurable FloodPass evidence pilot for response, finance or planning." };

export default function Page() {
  return <PartnerScreen />;
}
