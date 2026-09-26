import type { Metadata } from "next";
import { HelpScreen } from "@/components/floodpass/InfoScreens";

export const metadata: Metadata = { title: "What to do in a flood | FloodPass" };

export default function Page() {
  return <HelpScreen />;
}
