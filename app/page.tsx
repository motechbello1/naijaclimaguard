import type { Metadata } from "next";
import HomeScreen from "@/components/floodpass/HomeScreen";

export const metadata: Metadata = {
  title: "NaijaClimaGuard | Know before. Act together. Prove after.",
  description: "Check available flood context for your area, report water and review a FloodPass record. Public safety information and reporting are free.",
};

export default function Page() {
  return <HomeScreen />;
}
