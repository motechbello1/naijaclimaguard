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
import LandingIntro from "@/components/floodpass/LandingIntro";

// Public FloodPass screens have their own layout and controls.
const FLOODPASS_PREFIXES = ["/floodpass", "/check", "/pass", "/partners", "/contact"];
function isFloodPassPath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/" || FLOODPASS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const floodPass = isFloodPassPath(pathname);
  const ownControls = pathname === "/login" || pathname === "/register" || pathname === "/my-area";
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
              {pathname === "/" && <LandingIntro />}
              {floodPass ? null : <SplashScreen />}
              {floodPass ? children : <AppMotionFrame>{children}</AppMotionFrame>}
              {floodPass || ownControls ? null : <GlobalAccessibilityDock />}
              {floodPass || ownControls ? null : <FloodAssistant />}
            </SpeechProvider>
          </LanguageProvider>
        </NationalAreaProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
