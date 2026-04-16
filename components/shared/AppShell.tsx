"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Shield, LayoutDashboard, Map, Zap, BarChart3,
  FileText, Code, History, Settings, LogOut,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import SatelliteStatus from "./SatelliteStatus";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/predict", label: "Predict", icon: Map, badge: "Layer 1" },
  { href: "/action", label: "Action", icon: Zap, badge: "Layer 2" },
  { href: "/prove", label: "Prove", icon: BarChart3, badge: "Layer 3" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light shrink-0 overflow-hidden transition-all duration-300 ${
          collapsed ? "w-[68px]" : "w-[240px]"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-midnight-border">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-radar/10 border border-radar/20">
              <Shield className="h-4 w-4 text-radar" />
            </div>
            {!collapsed && (
              <span className="font-display text-sm font-bold whitespace-nowrap">
                NaijaClima<span className="text-radar">Guard</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-radar/10 text-radar border border-radar/20"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{item.badge}</span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-slate-100 dark:border-midnight-border">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Back to Site</span>}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-slate-200 dark:border-midnight-border bg-white/80 dark:bg-midnight/80 backdrop-blur-xl">
          <SatelliteStatus />
          <ThemeToggle />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}