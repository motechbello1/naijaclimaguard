import type { Metadata } from "next";
import DemoChat from "@/components/floodpass/DemoChat";

export const metadata: Metadata = { title: "WhatsApp demo | FloodPass", robots: { index: false } };

export default function Page() {
  return <DemoChat />;
}
