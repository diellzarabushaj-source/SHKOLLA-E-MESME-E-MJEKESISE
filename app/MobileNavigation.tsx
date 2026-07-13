"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/",
    label: "Ballina",
    match: (pathname: string) => pathname === "/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m3 10.8 9-7.3 9 7.3v8.7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-8.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/#klasat",
    label: "Klasat",
    match: () => false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M18 7h1a2 2 0 0 1 2 2v10.5h-3M8.5 9h6M8.5 12.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/progress",
    label: "Progresi",
    match: (pathname: string) => pathname.startsWith("/progress"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M3 19.5h19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

export default function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav className="mobile-navigation" aria-label="Navigimi kryesor në telefon">
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            className={`mobile-navigation-item${active ? " is-active" : ""}`}
            href={item.href}
            key={item.href}
            aria-current={active ? "page" : undefined}
          >
            <span className="mobile-navigation-icon">{item.icon}</span>
            <span className="mobile-navigation-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
