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

const EXPERIENCE_STORAGE_KEY = "naijaclimaguard.action-role";

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function resetUnauthenticatedExperience() {
  window.localStorage.removeItem(EXPERIENCE_STORAGE_KEY);
  document.documentElement.dataset.experienceRole = "household";
}

export default function RouteSecurityGuard() {
  const pathname = usePathname();
  const { status } = useSession();

  useEffect(() => {
    if (status !== "unauthenticated") return;
    resetUnauthenticatedExperience();
    if (isProtected(pathname)) {
      window.location.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, status]);

  useEffect(() => {
    const verifyAfterHistoryRestore = async (event: PageTransitionEvent) => {
      if (!event.persisted || !isProtected(window.location.pathname)) return;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
        const session = response.ok ? await response.json() : null;
        if (!session?.user) {
          resetUnauthenticatedExperience();
          window.location.replace("/login");
        }
      } catch {
        resetUnauthenticatedExperience();
        window.location.replace("/login");
      }
    };
    window.addEventListener("pageshow", verifyAfterHistoryRestore);
    return () => window.removeEventListener("pageshow", verifyAfterHistoryRestore);
  }, []);

  return null;
}
