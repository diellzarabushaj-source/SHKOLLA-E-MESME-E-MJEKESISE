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
  window.dispatchEvent(new CustomEvent("medical-portal:navigation"));
}

export default function NavigationSafety() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== "/" || window.location.pathname !== "/") return;
      if (url.hash && url.hash !== "#klasat") return;

      const open = portalIsOpen();
      if (!open && url.hash !== "#klasat") return;
      if (!open && url.hash === "#klasat") return;

      event.preventDefault();
      window.localStorage.removeItem(SELECTED_GRADE_KEY);

      if (url.hash === "#klasat") {
        window.history.pushState({ __medicalPortal: true }, "", "/#klasat");
        dispatchPortalNavigation(CLASSES_EVENT);
      } else {
        window.history.pushState({ __medicalPortal: true }, "", "/");
        dispatchPortalNavigation(HOME_EVENT);
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
