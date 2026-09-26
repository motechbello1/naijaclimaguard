"use client";

import { useState, useEffect } from "react";
import { BrandMark } from "./BrandLogo";

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

    const finish = window.setTimeout(() => {
      setVisible(false);
      announceComplete();
    }, 1420);
    const timer = window.setTimeout(() => {
      setFadeOut(true);
    }, 920);

    return () => { window.clearTimeout(timer); window.clearTimeout(finish); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#0b282b] text-[#f4f8ed] transition-all duration-500 ease-out ${
        fadeOut ? "translate-y-[-101%]" : "translate-y-0"
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#daf18c]/[.06] blur-3xl" />
      </div>
      <BrandMark inverse className="relative mb-8 h-14 w-14" />
      <div
        className="relative text-3xl font-extrabold tracking-[-.055em] sm:text-4xl"
        style={{ animation: "splashWordmark .72s cubic-bezier(.16,1,.3,1) both" }}
      >
        NaijaClima<span className="text-[#daf18c]">Guard</span>
      </div>

      <div className="relative mt-6 h-[2px] w-[180px] overflow-hidden bg-white/20">
        <div
          className="h-full bg-[#daf18c]"
          style={{ animation: "splashDraw 1s cubic-bezier(.16,1,.3,1) .18s both" }}
        />
      </div>

      <p
        className="relative mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5d9cb]"
        style={{ animation: "splashFade .62s cubic-bezier(.16,1,.3,1) .62s both" }}
      >
        Know before / Act together / Prove after
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
