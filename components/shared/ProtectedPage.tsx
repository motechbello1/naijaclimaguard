"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AppShell from "./AppShell";

export default function ProtectedPage({ children, requiredPlan }: { children: React.ReactNode; requiredPlan?: string[] }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return <AppShell><div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-radar border-t-transparent rounded-full" /></div></AppShell>;
  }

  if (!session) return null;

  const userPlan = (session.user as any)?.plan || "FREE";
  const PLAN_RANK: Record<string, number> = { FREE: 0, PROFESSIONAL: 1, ENTERPRISE: 2 };

  if (requiredPlan && requiredPlan.length > 0) {
    const userRank = PLAN_RANK[userPlan] || 0;
    const minRequired = Math.min(...requiredPlan.map((p) => PLAN_RANK[p] || 0));
    if (userRank < minRequired) {
      return (
        <AppShell>
          <div className="flex items-center justify-center h-64">
            <div className="glass-card rounded-2xl p-10 text-center max-w-md">
              <div className="text-4xl mb-4">🔒</div>
              <h2 className="font-display text-xl font-bold mb-2">Upgrade Required</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">This feature requires {requiredPlan[0]} plan. You are on {userPlan}.</p>
              <button onClick={() => router.push("/#pricing")} className="rounded-xl bg-radar px-6 py-2.5 text-sm font-semibold text-white hover:bg-radar/90 shadow-lg shadow-radar/20">View Plans</button>
            </div>
          </div>
        </AppShell>
      );
    }
  }

  return <AppShell>{children}</AppShell>;
}