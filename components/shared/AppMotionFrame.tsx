"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppMotionFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [splashReady, setSplashReady] = useState(false);

  useEffect(() => {
    const alreadyShown = window.sessionStorage.getItem("ncg-splash-shown") === "1";
    if (alreadyShown) {
      setSplashReady(true);
      return;
    }

    const onSplashComplete = () => setSplashReady(true);
    window.addEventListener("ncg:splash-complete", onSplashComplete);

    // Safety fallback in case the splash event is interrupted by a browser restore.
    const fallback = window.setTimeout(() => setSplashReady(true), 2800);
    return () => {
      window.removeEventListener("ncg:splash-complete", onSplashComplete);
      window.clearTimeout(fallback);
    };
  }, []);

  const initial = reduceMotion
    ? { opacity: splashReady ? 1 : 0 }
    : { opacity: 0, y: 26, scale: 0.982, filter: "blur(10px)" };
  const animate = reduceMotion
    ? { opacity: splashReady ? 1 : 0 }
    : splashReady
      ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
      : { opacity: 0, y: 18, scale: 0.988, filter: "blur(8px)" };
  const exit = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: -14, scale: 0.992, filter: "blur(5px)" };

  return (
    <>
      <AnimatePresence mode="wait" initial>
        <motion.div
          key={`${pathname}:${splashReady ? "ready" : "waiting"}`}
          className="app-route-motion-frame min-h-[100dvh]"
          initial={initial}
          animate={animate}
          exit={exit}
          transition={
            reduceMotion
              ? { duration: 0.12 }
              : {
                  duration: splashReady ? 0.62 : 0.24,
                  ease: [0.16, 1, 0.3, 1],
                }
          }
          style={{ transformOrigin: "50% 16%", willChange: "transform, opacity, filter" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {!reduceMotion && splashReady && (
        <motion.div
          key={`route-progress:${pathname}`}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-[10000] h-[3px] bg-[#d9ff57] shadow-[0_0_18px_rgba(217,255,87,.7)]"
          initial={{ width: "0%", opacity: 0 }}
          animate={{ width: ["0%", "32%", "78%", "100%"], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.72, times: [0, 0.22, 0.72, 1], ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </>
  );
}
