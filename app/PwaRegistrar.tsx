"use client";

import { useEffect, useState } from "react";
import styles from "./pwa.module.css";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const SERVICE_WORKER_URL = "/sw.js?v=9";

export default function PwaRegistrar() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState<ServiceWorker | null>(null);
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    // Development asset URLs are mutable; a production worker would cache stale UI.
    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;
    let disposed = false;

    const register = async () => {
      try {
        const nextRegistration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" });
        if (disposed || !nextRegistration) return;
        registration = nextRegistration;

        if (typeof nextRegistration.update === "function") {
          await nextRegistration.update().catch(() => undefined);
        }
        if (disposed) return;

        if (nextRegistration.waiting) setUpdateReady(nextRegistration.waiting);

        nextRegistration.addEventListener("updatefound", () => {
          const worker = nextRegistration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (!disposed && worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(worker);
            }
          });
        });
      } catch (error) {
        // Service workers may be unavailable in private mode, restricted browsers,
        // automated audits or when the user has disabled site storage. The portal
        // remains fully usable as a normal website, so this is not a user-facing error.
        if (process.env.NODE_ENV !== "production") console.warn("PWA registration unavailable", error);
      }
    };

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const onOnline = () => {
      setOffline(false);
      navigator.serviceWorker.controller?.postMessage({ type: "FLUSH_PROGRESS_QUEUE" });
    };
    const onOffline = () => setOffline(true);
    const onControllerChange = () => window.location.reload();

    setOffline(!navigator.onLine);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    void register();

    return () => {
      disposed = true;
      registration = null;
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  function update() {
    updateReady?.postMessage({ type: "SKIP_WAITING" });
  }

  const noticeKind = offline ? "offline" : updateReady ? "update" : installEvent ? "install" : null;
  if (!noticeKind || dismissed === noticeKind) return null;

  return (
    <aside className={styles.notice} aria-live="polite">
      <div>
        <strong>{offline ? "Je offline" : updateReady ? "Version i ri gati" : "Instalo portalin"}</strong>
        <span>
          {offline
            ? "Lidhu sërish me internetin për të hapur PDF dhe përmbajtje të re."
            : updateReady
              ? "Përditësoje për ta marrë versionin më të ri."
              : "Hape si aplikacion direkt nga ekrani kryesor."}
        </span>
      </div>
      {!offline && !updateReady && installEvent && <button type="button" onClick={() => void install()}>Instalo</button>}
      {!offline && updateReady && <button type="button" onClick={update}>Përditëso</button>}
      <button className={styles.dismiss} type="button" aria-label="Mbyll njoftimin" onClick={() => setDismissed(noticeKind)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
    </aside>
  );
}
