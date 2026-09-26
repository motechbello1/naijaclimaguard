import type { Metadata } from "next";
import FounderScreen from "@/components/floodpass/FounderScreen";

export const metadata: Metadata = { title: "Founder desk | FloodPass", robots: { index: false } };

export default function Page() {
  return <FounderScreen />;
}
