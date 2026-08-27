"use client";

import { useEffect, useState, type ElementType } from "react";
import styles from "./progress.module.css";

declare global {
  interface Window {
    metabaseConfig?: {
      isGuest: boolean;
      instanceUrl: string;
      guestEmbedProviderUri: string;
    };
  }
}

const MetabaseDashboard = "metabase-dashboard" as unknown as ElementType;
const SCRIPT_MARKER = "data-school-metabase-embed";

export default function MetabaseProgressAnalytics({
  siteUrl,
  dashboardId,
}: {
  siteUrl: string | null;
  dashboardId: string | null;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    siteUrl && dashboardId ? "loading" : "idle",
  );

  useEffect(() => {
    if (!siteUrl || !dashboardId) return;

    window.metabaseConfig = {
      isGuest: true,
      instanceUrl: siteUrl,
      guestEmbedProviderUri: "/api/metabase-guest-token",
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[${SCRIPT_MARKER}="true"]`,
    );

    if (existing) {
      if (customElements.get("metabase-dashboard")) {
        setStatus("ready");
        return;
      }

      const onLoad = () => setStatus("ready");
      const onError = () => setStatus("error");
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });
      return () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
      };
    }

    const script = document.createElement("script");
    script.src = `${siteUrl}/app/embed.js`;
    script.defer = true;
    script.setAttribute(SCRIPT_MARKER, "true");
    script.addEventListener("load", () => setStatus("ready"), { once: true });
    script.addEventListener("error", () => setStatus("error"), { once: true });
    document.head.appendChild(script);
  }, [siteUrl, dashboardId]);

  if (!siteUrl || !dashboardId) return null;

  return (
    <section className={styles.metabaseSection} aria-labelledby="metabase-progress-title">
      <header className={styles.metabaseHeader}>
        <div>
          <span className={styles.eyebrow}>Analitikë e avancuar</span>
          <h2 id="metabase-progress-title">Metabase · Progresi im</h2>
          <p>
            Analiza e detajuar përdor të njëjtat të dhëna reale të progresit,
            të kufizuara vetëm te llogaria jote.
          </p>
        </div>
        <span className={styles.metabaseBadge}>Live analytics</span>
      </header>

      <div className={styles.metabaseFrame}>
        {status === "loading" && (
          <div className={styles.metabaseLoading} role="status">
            <span className={styles.loader} />
            Duke ngarkuar analizën…
          </div>
        )}

        {status === "error" && (
          <div className={styles.metabaseError} role="alert">
            Metabase nuk u ngarkua. Dashboard-i bazë vazhdon të funksionojë normalisht.
          </div>
        )}

        {status === "ready" && (
          <MetabaseDashboard
            dashboard-id={dashboardId}
            with-title="false"
            with-downloads="false"
            auto-refresh-interval="60"
            className={styles.metabaseDashboard}
          />
        )}
      </div>
    </section>
  );
}
