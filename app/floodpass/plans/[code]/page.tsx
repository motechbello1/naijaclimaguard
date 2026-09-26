import type { Metadata } from "next";
import CheckoutScreen from "@/components/floodpass/CheckoutScreen";

export const metadata: Metadata = { title: "Choose a plan | FloodPass" };

export default function Page({ params, searchParams }: { params: { code: string }; searchParams: { check?: string } }) {
  return <CheckoutScreen code={params.code} addressCheckCode={searchParams.check ?? null} />;
}
