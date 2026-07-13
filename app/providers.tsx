"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import SplashScreen from "@/components/shared/SplashScreen";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <SplashScreen />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
