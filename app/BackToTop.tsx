"use client";

import { useEffect, useState } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(window.scrollY > 560);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  if (!visible) return null;

  function goToTop() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }

  return (
    <button className="back-to-top" type="button" onClick={goToTop} aria-label="Kthehu në krye" title="Kthehu në krye">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 11 6-6 6 6M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span>Në krye</span>
    </button>
  );
}
