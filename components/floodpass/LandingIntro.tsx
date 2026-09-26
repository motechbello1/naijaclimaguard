"use client";

import { useEffect, useState } from "react";

const KEY = "ncg-landing-intro-seen";

export default function LandingIntro() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(KEY)) return;
    window.sessionStorage.setItem(KEY, "1");
    setVisible(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const exit = window.setTimeout(() => setLeaving(true), reduced ? 180 : 1900);
    const finish = window.setTimeout(() => {
      setVisible(false);
    }, reduced ? 250 : 2600);
    return () => { window.clearTimeout(exit); window.clearTimeout(finish); };
  }, []);

  if (!visible) return null;
  return <div className={`ncg-landing-intro${leaving ? " is-leaving" : ""}`} aria-label="NaijaClimaGuard is opening" role="status">
    <div className="ncg-intro-top"><span>NAIJACLIMAGUARD</span><span>NIGERIA / 001</span></div>
    <div className="ncg-intro-center"><span className="ncg-intro-rule" /><p>Know before.<br /><em>Act together.</em><br />Prove after.</p><span className="ncg-intro-sub">FLOOD INTELLIGENCE FOR PEOPLE</span></div>
    <div className="ncg-intro-bottom"><span>READING THE LANDSCAPE</span><span className="ncg-intro-progress" /></div>
  </div>;
}
