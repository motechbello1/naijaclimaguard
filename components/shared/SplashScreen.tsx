"use client";

import { useState, useEffect } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Check if already shown this session
    if (sessionStorage.getItem("ncg-splash-shown")) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem("ncg-splash-shown", "1");
      }, 500);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-cloud dark:bg-midnight transition-opacity duration-500 ease-out ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Wordmark */}
      <div className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        NaijaClima<span className="text-radar">Guard</span>
      </div>

      {/* Waterline — draws beneath wordmark */}
      <div className="mt-3 w-[180px] h-[2px] overflow-hidden">
        <div
          className="h-full bg-radar"
          style={{
            animation: "splashDraw 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both",
          }}
        />
      </div>

      {/* Tagline */}
      <p
        className="mt-4 text-xs tracking-[0.14em] uppercase text-slate-400 dark:text-slate-500"
        style={{
          animation: "splashFade 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.8s both",
        }}
      >
        Physical risk intelligence
      </p>

      <style jsx>{`
        @keyframes splashDraw {
          from { transform: scaleX(0); transform-origin: left; }
          to { transform: scaleX(1); transform-origin: left; }
        }
        @keyframes splashFade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes splashDraw { from, to { transform: scaleX(1); } }
          @keyframes splashFade { from, to { opacity: 1; transform: none; } }
        }
      `}</style>
    </div>
  );
}
