"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import SplashScreen from "@/components/shared/SplashScreen";
import { LanguageProvider } from "@/components/shared/LanguageProvider";
import LanguageSelector from "@/components/shared/LanguageSelector";
import FloodAssistant from "@/components/assistant/FloodAssistant";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <LanguageProvider>
          <SplashScreen />
          {children}
          <div className="fixed bottom-5 left-5 z-[79]">
            <LanguageSelector />
          </div>
          <FloodAssistant />
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
