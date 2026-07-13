"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
    >
      {isDark ? <Moon className="h-4 w-4 text-slate-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
    </button>
  );
}