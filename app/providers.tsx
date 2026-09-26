"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import SplashScreen from "@/components/shared/SplashScreen";
import { LanguageProvider } from "@/components/shared/LanguageProvider";
import LanguagePreferenceSync from "@/components/shared/LanguagePreferenceSync";
import PlatformTranslationBridge from "@/components/shared/PlatformTranslationBridge";
import { SpeechProvider } from "@/components/shared/SpeechProvider";
import GlobalAccessibilityDock from "@/components/shared/GlobalAccessibilityDock";
import { NationalAreaProvider } from "@/components/shared/NationalArea";
import FloodAssistant from "@/components/assistant/FloodAssistant";
import ThemeBrandSync from "@/components/shared/ThemeBrandSync";
import RouteSecurityGuard from "@/components/shared/RouteSecurityGuard";
import AppMotionFrame from "@/components/shared/AppMotionFrame";

// FloodPass screens have their own calm, light layout: no splash screen and no
// floating buttons covering the text (a problem found in the diagnostics).
const FLOODPASS_PREFIXES = ["/floodpass", "/check", "/pass", "/partners", "/contact"];
function isFloodPassPath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/" || FLOODPASS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function Providers({ children }: { children: ReactNode }) {
  const floodPass = isFloodPassPath(usePathname());
  return (
    <SessionProvider refetchOnWindowFocus refetchInterval={5 * 60}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme={floodPass ? "light" : undefined}>
        <ThemeBrandSync />
        <NationalAreaProvider>
          <LanguageProvider>
            <SpeechProvider>
              <RouteSecurityGuard />
              <LanguagePreferenceSync />
              <PlatformTranslationBridge />
              {floodPass ? null : <SplashScreen />}
              {floodPass ? children : <AppMotionFrame>{children}</AppMotionFrame>}
              {floodPass ? null : <GlobalAccessibilityDock />}
              {floodPass ? null : <FloodAssistant />}
            </SpeechProvider>
          </LanguageProvider>
        </NationalAreaProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
