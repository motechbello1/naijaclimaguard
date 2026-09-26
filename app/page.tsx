import type { Metadata } from "next";
import HomeScreen from "@/components/floodpass/HomeScreen";

export const metadata: Metadata = {
  title: "FloodPass by NaijaClimaGuard: proof that turns a flood into help",
  description: "See official flood warnings, report water where you are, and check a FloodPass record. Warnings and proof are free.",
};

export default function Page() {
  return <HomeScreen />;
}
