"use client";

import { useEffect, useRef, useState } from "react";
import { Expand, Play, X } from "lucide-react";

const FILM_ID = "9G4bSifRjuU";
const EMBED = `https://www.youtube-nocookie.com/embed/${FILM_ID}?autoplay=1&rel=0&modestbranding=1&end=120`;

function FilmFrame({ title }: { title: string }) {
  return (
    <iframe
      src={EMBED}
      title={title}
      className="absolute inset-0 h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}

export default function PitchFilm() {
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.history.pushState({ ncgPitchFilm: true }, "", window.location.href);
    closeButton.current?.focus();

    const close = () => setExpanded(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) {
        event.preventDefault();
        window.history.back();
      }
    };
    window.addEventListener("popstate", close, { once: true });
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("popstate", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  return (
    <>
      <div className={expanded ? "fixed inset-0 z-[100] flex items-center justify-center bg-[#020906]/94 p-3 backdrop-blur-xl sm:p-8" : ""} role={expanded ? "dialog" : undefined} aria-modal={expanded ? true : undefined} aria-label={expanded ? "Expanded NaijaClimaGuard concept film" : undefined}>
        <div className={`group relative aspect-video overflow-hidden border border-black/10 bg-[#102820] shadow-[0_24px_80px_rgba(3,25,18,.22)] dark:border-white/15 ${expanded ? "w-full max-w-6xl rounded-[1.5rem]" : "rounded-[2rem]"}`}>
          {playing ? <FilmFrame title="NaijaClimaGuard two-minute concept film" /> : <>
            <img src="/brand/pitch-film-poster.svg" alt="NaijaClimaGuard concept-film cover" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06130f] via-[#06130f]/45 to-[#06130f]/10" />
            <button onClick={() => setPlaying(true)} className="absolute inset-0 flex flex-col items-center justify-center text-center text-white" aria-label="Play the two-minute NaijaClimaGuard concept film">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#d9ff57] text-[#071713] shadow-[0_16px_50px_rgba(0,0,0,.28)] transition group-hover:scale-105"><Play className="ml-1 h-7 w-7 fill-current" /></span>
              <span className="mt-5 text-lg font-black">Play the two-minute concept film</span>
              <span className="mt-1 text-xs text-white/65">Problem → product → proof → ask</span>
            </button>
          </>}
          {playing && !expanded && <button onClick={() => setExpanded(true)} className="absolute right-3 top-3 z-10 flex h-10 items-center gap-2 rounded-full bg-black/75 px-3 text-xs font-black text-white backdrop-blur" aria-label="Expand film"><Expand className="h-4 w-4" /> Expand</button>}
        </div>
        {expanded && <button ref={closeButton} onClick={() => window.history.back()} className="absolute right-4 top-4 z-20 flex h-11 items-center gap-2 rounded-full bg-white px-4 text-xs font-black text-[#071713]" aria-label="Close expanded film"><X className="h-4 w-4" /> Back to pitch</button>}
      </div>
      <p className="mt-3 text-[11px] font-semibold leading-5 text-slate-500 dark:text-white/48">Earlier concept film, shown as a maximum two-minute cut. The current evidence and claim boundaries on this page supersede any earlier concept wording.</p>
    </>
  );
}
