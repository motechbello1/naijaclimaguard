"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import SplashScreen from "@/components/shared/SplashScreen";
import { LanguageProvider } from "@/components/shared/LanguageProvider";
import LanguagePreferenceSync from "@/components/shared/LanguagePreferenceSync";
import PlatformTranslationBridge from "@/components/shared/PlatformTranslationBridge";
import { SpeechProvider } from "@/components/shared/SpeechProvider";
import GlobalAccessibilityDock from "@/components/shared/GlobalAccessibilityDock";
import { NationalAreaProvider } from "@/components/shared/NationalArea";
import FloodAssistant from "@/components/assistant/FloodAssistant";
import ThemeBrandSync from "@/components/shared/ThemeBrandSync";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <ThemeBrandSync />
        <NationalAreaProvider>
          <LanguageProvider>
            <SpeechProvider>
              <LanguagePreferenceSync />
              <PlatformTranslationBridge />
              <SplashScreen />
              {children}
              <GlobalAccessibilityDock />
              <FloodAssistant />
            </SpeechProvider>
          </LanguageProvider>
        </NationalAreaProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
