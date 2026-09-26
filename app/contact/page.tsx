import type { Metadata } from "next";
import PilotInquiryScreen from "@/components/floodpass/PilotInquiryScreen";

export const metadata: Metadata = {
  title: "Discuss an evidence pilot | NaijaClimaGuard",
  description: "Tell us what decision your team needs to improve. Scope a measured FloodPass evidence pilot with NaijaClimaGuard.",
};

export default function Page() { return <PilotInquiryScreen />; }
