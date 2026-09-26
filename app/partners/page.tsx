import type { Metadata } from "next";
import PartnerScreen from "@/components/floodpass/PartnerScreen";

export const metadata: Metadata = { title: "For partners | FloodPass" };

export default function Page() {
  return <PartnerScreen />;
}
