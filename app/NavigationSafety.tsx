"use client";

import { useEffect } from "react";

const SELECTED_GRADE_KEY = "medical-portal-selected-grade";
const HOME_EVENT = "medical-portal:home";
const CLASSES_EVENT = "medical-portal:classes";

function portalIsOpen(): boolean {
  return Boolean(
    window.localStorage.getItem(SELECTED_GRADE_KEY)
      || document.querySelector("main.inner-page")
      || document.querySelector("main.study-page"),
  );
}

function dispatchPortalNavigation(eventName: string): void {
  window.dispatchEvent(new CustomEvent(eventName));
}

export default function NavigationSafety() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== "/") return;
      if (url.hash && url.hash !== "#klasat") return;

      // Home and Classes must always mean a real escape from the saved learning flow,
      // including when the user clicks them from /progress or an authentication page.
      window.localStorage.removeItem(SELECTED_GRADE_KEY);

      // On another route, let Next.js perform the normal route transition. Once the
      // homepage mounts it will no longer reopen the previously saved grade.
      if (window.location.pathname !== "/") return;

      // On the homepage the portal is an in-page state machine, so update it without
      // a reload while preserving browser Back/Forward history.
      if (!portalIsOpen()) return;
      event.preventDefault();
      dispatchPortalNavigation(url.hash === "#klasat" ? CLASSES_EVENT : HOME_EVENT);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
