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
    localStorage.setItem("flashcards-theme", nextTheme);
  }

  const title = theme === "dark" ? "Aktivizo temën e ndritshme" : "Aktivizo temën e errët";

  return (
    <button
      aria-label="Ndrysho temën light/dark"
      aria-pressed={theme === "dark"}
      className="theme-switch"
      data-theme-state={theme}
      onClick={toggleTheme}
      title={title}
      type="button"
    >
      <span className="sr-only">{title}</span>
      <span className="theme-slider round" aria-hidden="true">
        <span className="sun-moon">
          <svg id="moon-dot-1" className="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="moon-dot-2" className="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="moon-dot-3" className="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="light-ray-1" className="light-ray" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="light-ray-2" className="light-ray" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="light-ray-3" className="light-ray" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="cloud-1" className="cloud-dark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="cloud-2" className="cloud-dark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="cloud-3" className="cloud-dark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="cloud-4" className="cloud-light" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="cloud-5" className="cloud-light" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="cloud-6" className="cloud-light" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
        </span>
        <span className="stars">
          {[1, 2, 3, 4].map((star) => (
            <svg id={`star-${star}`} className="star" viewBox="0 0 20 20" key={star}>
              <path d="M 0 10 C 10 10,10 10,0 10 C 10 10,10 10,10 20 C 10 10,10 10,20 10 C 10 10,10 10,10 0 C 10 10,10 10,0 10 Z" />
            </svg>
          ))}
        </span>
      </span>
    </button>
  );
}
