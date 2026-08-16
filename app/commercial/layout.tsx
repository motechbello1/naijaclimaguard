import { Suspense } from "react";

export default function CommercialLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-[60vh]" />}>{children}</Suspense>;
}
