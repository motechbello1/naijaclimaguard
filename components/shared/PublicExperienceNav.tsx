"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowUpRight, LayoutDashboard, LogIn, Waves } from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import ThemeToggle from "./ThemeToggle";
import { useLanguage } from "./LanguageProvider";
import { PRODUCT_PROOF_COPY } from "@/lib/i18n/product-proof";

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

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#071713]/94 text-white backdrop-blur-xl" aria-label="Public product navigation">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" data-ncg-no-translate="true">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10"><Waves className="h-4 w-4 text-[#d9ff57]" /></span>
          <span className="font-display text-base font-black tracking-[-.03em] sm:text-lg">NaijaClimaGuard</span>
        </Link>

        <div className="hidden items-center gap-5 xl:flex">
          {productLinks.map((item) => <Link key={item.href} href={item.href} className="text-xs font-bold text-white/58 transition hover:text-white">{item.label}</Link>)}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden 2xl:block"><LanguageSelector compact /></div>
          <ThemeToggle />
          {session ? (
            <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#d9ff57] px-3.5 text-xs font-black text-[#071713] sm:px-4"><LayoutDashboard className="h-4 w-4" /><span className="hidden sm:inline">{proof.dashboard}</span><span className="sm:hidden">Dashboard</span></Link>
          ) : (
            <>
              <Link href="/login" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 px-3 text-xs font-bold text-white/78 transition hover:bg-white/8 hover:text-white"><LogIn className="h-4 w-4" /><span className="hidden sm:inline">{proof.signIn}</span></Link>
              <Link href="/register" className="hidden min-h-10 items-center gap-2 rounded-full bg-[#d9ff57] px-4 text-xs font-black text-[#071713] sm:inline-flex">{proof.register}<ArrowUpRight className="h-4 w-4" /></Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
