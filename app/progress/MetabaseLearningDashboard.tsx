"use client";

import { useMemo } from "react";
import {
  InteractiveDashboard,
  MetabaseProvider,
  defineMetabaseAuthConfig,
} from "@metabase/embedding-sdk-react";
import styles from "./metabase.module.css";

type MetabaseLearningDashboardProps = {
  instanceUrl: string;
  dashboardId: number;
};

export default function MetabaseLearningDashboard({
  instanceUrl,
  dashboardId,
}: MetabaseLearningDashboardProps) {
  const authConfig = useMemo(
    () =>
      defineMetabaseAuthConfig({
        metabaseInstanceUrl: instanceUrl,
        fetchRequestToken: async () => {
          const response = await fetch("/api/sso/metabase?response=json", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error("METABASE_AUTH_FAILED");
          }

          return response.json();
        },
      }),
    [instanceUrl],
  );

  return (
    <section className={styles.section} aria-labelledby="metabase-dashboard-title">
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Analitika Metabase</span>
          <h2 id="metabase-dashboard-title">Dashboard i avancuar</h2>
          <p>
            Analiza interaktive e progresit, e lidhur me llogarinë e kyçur.
          </p>
        </div>
        <span className={styles.badge}>Live analytics</span>
      </header>

      <div className={styles.frame}>
        <MetabaseProvider authConfig={authConfig}>
          <InteractiveDashboard
            dashboardId={dashboardId}
            withTitle={false}
            withDownloads={false}
          />
        </MetabaseProvider>
      </div>
    </section>
  );
}
