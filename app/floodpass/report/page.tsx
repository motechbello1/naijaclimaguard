import type { Metadata } from "next";
import ReportScreen from "@/components/floodpass/ReportScreen";

export const metadata: Metadata = { title: "Report water | FloodPass" };

export default function Page() {
  return <ReportScreen />;
}
