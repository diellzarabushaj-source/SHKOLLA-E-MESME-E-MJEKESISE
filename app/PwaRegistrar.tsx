"use client";

import { useEffect, useState } from "react";
import styles from "./pwa.module.css";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const SERVICE_WORKER_URL = "/sw.js?v=6";

export default function PwaRegistrar() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState<ServiceWorker | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" });
        await registration.update();

        if (registration.waiting) setUpdateReady(registration.waiting);

        registration.addEventListener("updatefound", () => {
          const worker = registration?.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(worker);
          });
        });
      } catch (error) {
        console.error("PWA registration failed", error);
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

  if (!installEvent && !updateReady && !offline) return null;

  return (
    <aside className={styles.notice} aria-live="polite">
      <div>
        <strong>{offline ? "Je offline" : updateReady ? "Version i ri gati" : "Instalo portalin"}</strong>
        <span>
          {offline
            ? "Mësimet dhe flashcards e hapura më parë vazhdojnë të funksionojnë."
            : updateReady
              ? "Përditësoje për ta marrë versionin më të ri."
              : "Hape si aplikacion direkt nga ekrani kryesor."}
        </span>
      </div>
      {installEvent && <button type="button" onClick={() => void install()}>Instalo</button>}
      {updateReady && <button type="button" onClick={update}>Përditëso</button>}
    </aside>
  );
}
