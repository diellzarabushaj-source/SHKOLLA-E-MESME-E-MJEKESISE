"use client";

import { useEffect, useState, type ElementType } from "react";
import styles from "./progress.module.css";
import statusStyles from "./metabase-status.module.css";

declare global {
  interface Window {
    metabaseConfig?: {
      isGuest: boolean;
      instanceUrl: string;
      guestEmbedProviderUri: string;
      locale?: string;
    };
  }
}

type MetabaseDiagnostics = {
  configured: boolean;
  siteConfigured: boolean;
  dashboardConfigured: boolean;
  embedSecretConfigured: boolean;
  analyticsReady: boolean;
  metabaseReachable: boolean | null;
  missing: string[];
  analyticsViews: string[];
};

const MetabaseDashboard = "metabase-dashboard" as unknown as ElementType;
const SCRIPT_MARKER = "data-school-metabase-embed";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={ok ? statusStyles.ok : statusStyles.missing}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}

export default function MetabaseProgressAnalytics({
  enabled,
  siteUrl,
  dashboardId,
  isAdmin,
}: {
  enabled: boolean;
  siteUrl: string | null;
  dashboardId: string | null;
  isAdmin: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    enabled ? "loading" : "idle",
  );
  const [diagnostics, setDiagnostics] = useState<MetabaseDiagnostics | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    fetch("/api/admin/metabase-status", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("METABASE_STATUS_FAILED");
        return response.json() as Promise<MetabaseDiagnostics>;
      })
      .then((result) => {
        if (!cancelled) setDiagnostics(result);
      })
      .catch(() => {
        if (!cancelled) setDiagnostics(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!enabled || !siteUrl || !dashboardId) return;

    window.metabaseConfig = {
      isGuest: true,
      instanceUrl: siteUrl,
      guestEmbedProviderUri: "/api/metabase-guest-token",
      locale: "sq",
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[${SCRIPT_MARKER}="true"]`,
    );

    const ready = () => {
      if (customElements.get("metabase-dashboard")) {
        setStatus("ready");
      } else {
        setStatus("error");
      }
    };

    if (existing) {
      if (customElements.get("metabase-dashboard")) {
        setStatus("ready");
        return;
      }

      existing.addEventListener("load", ready, { once: true });
      existing.addEventListener("error", () => setStatus("error"), { once: true });
      return () => {
        existing.removeEventListener("load", ready);
      };
    }

    const script = document.createElement("script");
    script.src = `${siteUrl}/app/embed.js`;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.setAttribute(SCRIPT_MARKER, "true");
    script.addEventListener("load", ready, { once: true });
    script.addEventListener("error", () => setStatus("error"), { once: true });
    document.head.appendChild(script);
  }, [enabled, siteUrl, dashboardId]);

  if (!enabled || !siteUrl || !dashboardId) {
    if (!isAdmin) return null;

    return (
      <section className={statusStyles.setupCard} aria-labelledby="metabase-setup-title">
        <div className={statusStyles.setupHeader}>
          <div>
            <span className={statusStyles.kicker}>Metabase · status administratori</span>
            <h2 id="metabase-setup-title">Integrimi nuk është aktiv ende</h2>
            <p>
              Dashboard-i i nxënësit po punon me të dhënat reale. Metabase do të shfaqet
              sapo të jetë hostuar instanca dhe të plotësohen variablat e production-it.
            </p>
          </div>
          <span className={statusStyles.stateBadge}>Setup required</span>
        </div>

        <div className={statusStyles.statusGrid}>
          <StatusPill ok={Boolean(diagnostics?.analyticsReady)} label="Analytics views në Neon" />
          <StatusPill ok={Boolean(diagnostics?.siteConfigured)} label="Metabase site URL" />
          <StatusPill ok={Boolean(diagnostics?.dashboardConfigured)} label="Dashboard ID" />
          <StatusPill ok={Boolean(diagnostics?.embedSecretConfigured)} label="Guest embed secret" />
          <StatusPill ok={diagnostics?.metabaseReachable === true} label="Metabase service reachable" />
        </div>

        {diagnostics?.missing?.length ? (
          <p className={statusStyles.missingText}>
            Mungojnë: <strong>{diagnostics.missing.join(", ")}</strong>
          </p>
        ) : null}
      </section>
    );
  }

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
