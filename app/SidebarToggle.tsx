"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "medical-portal-sidebar-collapsed";

export default function SidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(document.documentElement.dataset.sidebarCollapsed === "true");
  }, []);

  function toggle() {
    const next = !collapsed;
    document.documentElement.dataset.sidebarCollapsed = String(next);
    setCollapsed(next);
    try { window.localStorage.setItem(STORAGE_KEY, String(next)); }
    catch { /* The control also works when browser storage is unavailable. */ }
  }

  const label = collapsed ? "Zgjero menunë" : "Minimizo menunë";

  return (
    <button
      className="sidebar-toggle"
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-expanded={!collapsed}
      aria-controls="desktop-navigation"
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m14 7-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
