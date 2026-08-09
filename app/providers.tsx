"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import SplashScreen from "@/components/shared/SplashScreen";
import { LanguageProvider } from "@/components/shared/LanguageProvider";
import LanguagePreferenceSync from "@/components/shared/LanguagePreferenceSync";
import { SpeechProvider } from "@/components/shared/SpeechProvider";
import GlobalAccessibilityDock from "@/components/shared/GlobalAccessibilityDock";
import FloodAssistant from "@/components/assistant/FloodAssistant";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <LanguageProvider>
          <SpeechProvider>
            <LanguagePreferenceSync />
            <SplashScreen />
            {children}
            <GlobalAccessibilityDock />
            <FloodAssistant />
          </SpeechProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
