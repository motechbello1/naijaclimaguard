import type { Metadata } from "next";
import AddressCheckScreen from "@/components/floodpass/AddressCheckScreen";

export const metadata: Metadata = { title: "Rent and Land Check | FloodPass" };

export default function Page() {
  return <AddressCheckScreen />;
}
