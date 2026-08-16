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
import FloodAssistant from "@/components/assistant/FloodAssistant";
import RouteSecurityGuard from "@/components/shared/RouteSecurityGuard";
import AppMotionFrame from "@/components/shared/AppMotionFrame";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus refetchInterval={5 * 60}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <LanguageProvider>
          <SpeechProvider>
            <RouteSecurityGuard />
            <LanguagePreferenceSync />
            <PlatformTranslationBridge />
            <SplashScreen />
            <AppMotionFrame>{children}</AppMotionFrame>
            <GlobalAccessibilityDock />
            <FloodAssistant />
          </SpeechProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
