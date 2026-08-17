"use client";

import { useState, useEffect } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const announceComplete = () => {
      window.sessionStorage.setItem("ncg-splash-shown", "1");
      window.dispatchEvent(new Event("ncg:splash-complete"));
    };

    if (sessionStorage.getItem("ncg-splash-shown")) {
      setVisible(false);
      window.requestAnimationFrame(() => window.dispatchEvent(new Event("ncg:splash-complete")));
      return;
    }

    const timer = window.setTimeout(() => {
      setFadeOut(true);
      window.setTimeout(() => {
        setVisible(false);
        announceComplete();
      }, 520);
    }, 1450);

    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-cloud dark:bg-midnight transition-all duration-500 ease-out ${
        fadeOut ? "scale-[1.015] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0"
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-radar/8 blur-3xl dark:bg-[#d9ff57]/[.045]" />
      </div>

      <div
        className="relative font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl"
        style={{ animation: "splashWordmark .72s cubic-bezier(.16,1,.3,1) both" }}
      >
        NaijaClima<span className="text-radar">Guard</span>
      </div>

      <div className="relative mt-3 h-[2px] w-[180px] overflow-hidden rounded-full bg-black/5 dark:bg-white/8">
        <div
          className="h-full bg-radar shadow-[0_0_14px_rgba(22,135,96,.45)] dark:bg-[#d9ff57] dark:shadow-[0_0_16px_rgba(217,255,87,.5)]"
          style={{ animation: "splashDraw 1s cubic-bezier(.16,1,.3,1) .18s both" }}
        />
      </div>

      <p
        className="relative mt-4 text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
        style={{ animation: "splashFade .62s cubic-bezier(.16,1,.3,1) .62s both" }}
      >
        Physical risk intelligence
      </p>

      <style jsx>{`
        @keyframes splashWordmark {
          from { opacity: 0; transform: translateY(12px) scale(.965); filter: blur(5px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes splashDraw {
          from { transform: scaleX(0); transform-origin: left; }
          to { transform: scaleX(1); transform-origin: left; }
        }
        @keyframes splashFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes splashWordmark { from, to { opacity: 1; transform: none; filter: none; } }
          @keyframes splashDraw { from, to { transform: scaleX(1); } }
          @keyframes splashFade { from, to { opacity: 1; transform: none; } }
        }
      `}</style>
    </div>
  );
}
