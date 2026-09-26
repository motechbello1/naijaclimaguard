import type { Metadata } from "next";
import { Suspense } from "react";
import CheckScreen from "@/components/floodpass/CheckScreen";

export const metadata: Metadata = { title: "Check a FloodPass code" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CheckScreen />
    </Suspense>
  );
}
