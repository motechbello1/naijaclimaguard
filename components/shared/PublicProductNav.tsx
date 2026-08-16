"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutDashboard, Shield } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import LanguageSelector from "./LanguageSelector";
import { useLanguage } from "./LanguageProvider";
import { PRODUCT_PROOF_COPY } from "@/lib/i18n/product-proof";

const PUBLIC_LINKS = [
  { href: "/my-area", key: "product" },
  { href: "/model-evidence", key: "evidence" },
  { href: "/investor-readiness", key: "investor" },
  { href: "/institutional-pilot", key: "pilot" },
] as const;

export default function PublicProductNav() {
  const pathname = usePathname();
  const { status } = useSession();
  const { locale } = useLanguage();
  const copy = PRODUCT_PROOF_COPY[locale].nav;
  const authenticated = status === "authenticated";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-midnight-border dark:bg-midnight/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="NaijaClimaGuard home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-radar/20 bg-radar/10">
            <Shield className="h-4 w-4 text-radar" />
          </span>
          <span className="hidden font-display text-base font-bold sm:inline">NaijaClima<span className="text-radar">Guard</span></span>
        </Link>

        <nav className="ml-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:ml-5" aria-label="Product navigation">
          {PUBLIC_LINKS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${active ? "bg-radar/10 text-radar" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"}`}
              >
                {copy[item.key]}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden md:block"><LanguageSelector compact /></div>
          <ThemeToggle />
          {authenticated ? (
            <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-radar px-3 text-xs font-bold text-white sm:px-4 sm:text-sm">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">{copy.dashboard}</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-semibold text-slate-600 hover:text-radar sm:inline dark:text-slate-300">{copy.signIn}</Link>
              <Link href="/register" className="inline-flex min-h-10 items-center rounded-lg bg-radar px-3 text-xs font-bold text-white sm:px-4 sm:text-sm">{copy.register}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

