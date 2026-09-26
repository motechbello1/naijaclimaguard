import type { Metadata } from "next";
import { PlansScreen } from "@/components/floodpass/InfoScreens";

export const metadata: Metadata = { title: "Membership and pilots | NaijaClimaGuard", description: "Public safety access is free. Explore future family membership and institutional evidence pilots." };

export default function Page() {
  return <PlansScreen />;
}
