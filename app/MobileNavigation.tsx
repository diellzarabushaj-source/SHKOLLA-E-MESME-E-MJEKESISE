"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavigationSection = "home" | "classes" | "progress";

const SELECTED_GRADE_KEY = "medical-portal-selected-grade";

const items = [
  {
    id: "home" as const,
    href: "/",
    label: "Ballina",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m3 10.8 9-7.3 9 7.3v8.7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-8.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "classes" as const,
    href: "/#klasat",
    label: "Klasat",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M18 7h1a2 2 0 0 1 2 2v10.5h-3M8.5 9h6M8.5 12.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "progress" as const,
    href: "/progress",
    label: "Progresi",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M3 19.5h19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

function resolveSection(pathname: string): NavigationSection {
  if (pathname.startsWith("/progress")) return "progress";
  if (pathname !== "/") return "home";

  const hash = window.location.hash;
  const hasSelectedGrade = Boolean(window.localStorage.getItem(SELECTED_GRADE_KEY));
  const isInsideLearningFlow = Boolean(document.querySelector("main.inner-page"));

  return hash === "#klasat" || hasSelectedGrade || isInsideLearningFlow ? "classes" : "home";
}

export default function MobileNavigation() {
  const pathname = usePathname();
  const [section, setSection] = useState<NavigationSection>("home");

  useEffect(() => {
    const sync = () => setSection(resolveSection(pathname));
    const observer = new MutationObserver(sync);

    sync();
    observer.observe(document.getElementById("main-content") || document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("medical-portal:navigation", sync as EventListener);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("medical-portal:navigation", sync as EventListener);
    };
  }, [pathname]);

  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".desktop-navigation [data-navigation-section]").forEach((item) => {
      const active = item.dataset.navigationSection === section;
      item.classList.toggle("is-active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
  }, [section]);

  const renderedItems = useMemo(() => items.map((item) => ({
    ...item,
    active: section === item.id,
  })), [section]);

  return (
    <nav className="mobile-navigation" aria-label="Navigimi kryesor në telefon">
      {renderedItems.map((item) => (
        <Link
          className={`mobile-navigation-item${item.active ? " is-active" : ""}`}
          href={item.href}
          key={item.id}
          aria-current={item.active ? "page" : undefined}
          data-navigation-section={item.id}
          onClick={() => setSection(item.id)}
        >
          <span className="mobile-navigation-icon">{item.icon}</span>
          <span className="mobile-navigation-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
