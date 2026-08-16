"use client";

import { usePathname } from "next/navigation";

export default function AppMotionFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="app-route-frame">
      {children}
    </div>
  );
}
