"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowUpRight, BadgeDollarSign, LayoutDashboard, LogIn } from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import ThemeToggle from "./ThemeToggle";
import { useLanguage } from "./LanguageProvider";
import { PRODUCT_PROOF_COPY } from "@/lib/i18n/product-proof";
import { BrandLockup } from "./BrandLogo";

const productLinks = [
  { href: "/my-area", label: "Product" },
  { href: "/impact", label: "Economic impact" },
  { href: "/action-center", label: "Action OS" },
  { href: "/model-evidence", label: "Evidence" },
  { href: "/investor-readiness", label: "Investor + TRL 6" },
  { href: "/pitch", label: "Pitch mode" },
];

export default function PublicExperienceNav() {
  const { data: session } = useSession();
  const { locale } = useLanguage();
  const proof = PRODUCT_PROOF_COPY[locale].nav;
  const revenueAdmin = Boolean((session?.user as any)?.revenueAdmin);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-black/8 bg-[#f7f7f2]/[.94] text-[#0d1f19] backdrop-blur-xl dark:border-white/10 dark:bg-[#071713]/[.94] dark:text-white" aria-label="Public product navigation">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <BrandLockup href="/" className="shrink-0" />

        <div className="hidden items-center gap-5 xl:flex">
          {productLinks.map((item) => <Link key={item.href} href={item.href} className="text-xs font-bold text-slate-600 transition hover:text-[#071713] dark:text-white/58 dark:hover:text-white">{item.label}</Link>)}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden 2xl:block"><LanguageSelector compact /></div>
          <ThemeToggle />
          {session ? (
            <>
              {revenueAdmin && <Link href="/admin" className="hidden min-h-10 items-center gap-2 rounded-full border border-emerald-800/20 px-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-50 dark:border-white/16 dark:text-[#d9ff57] dark:hover:bg-white/8 sm:inline-flex"><BadgeDollarSign className="h-4 w-4" /> Founder</Link>}
              <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#d9ff57] px-3.5 text-xs font-black text-[#071713] sm:px-4"><LayoutDashboard className="h-4 w-4" /><span className="hidden sm:inline">{proof.dashboard}</span><span className="sm:hidden">Dashboard</span></Link>
            </>
          ) : (
            <>
              <Link href="/login" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/15 px-3 text-xs font-bold text-slate-700 transition hover:bg-black/5 dark:border-white/20 dark:text-white/78 dark:hover:bg-white/8 dark:hover:text-white"><LogIn className="h-4 w-4" /><span className="hidden sm:inline">{proof.signIn}</span></Link>
              <Link href="/register" className="hidden min-h-10 items-center gap-2 rounded-full bg-[#d9ff57] px-4 text-xs font-black text-[#071713] sm:inline-flex">{proof.register}<ArrowUpRight className="h-4 w-4" /></Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
