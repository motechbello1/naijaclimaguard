import type { Metadata } from "next";
import DrainHeroesScreen from "@/components/floodpass/DrainHeroesScreen";

export const metadata: Metadata = { title: "Drain Heroes | FloodPass" };

export default function Page() {
  return <DrainHeroesScreen />;
}
