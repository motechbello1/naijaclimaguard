"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/my-area",
  "/live-floods",
  "/safe-route",
  "/action-center",
  "/action",
  "/command",
  "/intelligence",
  "/predict",
  "/outlook",
  "/evidence",
  "/report",
  "/prove",
  "/profile",
  "/drill",
  "/emergency-pack",
];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function RouteSecurityGuard() {
  const pathname = usePathname();
  const { status } = useSession();

  useEffect(() => {
    if (!isProtected(pathname)) return;
    if (status === "unauthenticated") {
      window.location.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, status]);

  useEffect(() => {
    const verifyAfterHistoryRestore = async (event: PageTransitionEvent) => {
      if (!event.persisted || !isProtected(window.location.pathname)) return;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
        const session = response.ok ? await response.json() : null;
        if (!session?.user) window.location.replace("/login");
      } catch {
        window.location.replace("/login");
      }
    };
    window.addEventListener("pageshow", verifyAfterHistoryRestore);
    return () => window.removeEventListener("pageshow", verifyAfterHistoryRestore);
  }, []);

  return null;
}
