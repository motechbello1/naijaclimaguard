import type { Metadata } from "next";
import CoverageScreen from "@/components/floodpass/CoverageScreen";

export const metadata: Metadata = { title: "All 36 states and the FCT | FloodPass" };

export default function Page() {
  return <CoverageScreen />;
}
