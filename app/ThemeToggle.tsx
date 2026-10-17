"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(current);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    try {
      window.localStorage.setItem("flashcards-theme", nextTheme);
    } catch {
      // Theme switching remains functional when browser storage is blocked.
    }
  }

  const title = theme === "dark" ? "Aktivizo temën e ndritshme" : "Aktivizo temën e errët";

  return (
    <button
      aria-label={title}
      aria-pressed={theme === "dark"}
      className="theme-switch theme-control"
      data-theme-state={theme}
      onClick={toggleTheme}
      title={title}
      type="button"
    >
      <svg className="theme-sun" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
      <svg className="theme-moon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.6 13.1A8.8 8.8 0 0 1 10.9 3.4 8.8 8.8 0 1 0 20.6 13.1Z" /></svg>
    </button>
  );
}
