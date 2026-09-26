"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { isProtectedPath } from "@/lib/protected-routes";


const EXPERIENCE_STORAGE_KEY = "naijaclimaguard.action-role";

function isProtected(pathname: string) {
  return isProtectedPath(pathname);
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
