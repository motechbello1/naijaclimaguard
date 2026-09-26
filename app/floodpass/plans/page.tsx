import type { Metadata } from "next";
import { PlansScreen } from "@/components/floodpass/InfoScreens";

export const metadata: Metadata = { title: "Plans | FloodPass" };

export default function Page() {
  return <PlansScreen />;
}
