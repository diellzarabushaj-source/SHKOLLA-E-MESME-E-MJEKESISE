import "server-only";

export type MetabaseServerConfig = {
  siteUrl: string | null;
  dashboardId: number | null;
  dashboardIdText: string | null;
  embedSecret: string | null;
  enabled: boolean;
};

function normalizedUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizedDashboardId(value: string | undefined): number | null {
  const candidate = value?.trim() || "";
  if (!/^\d+$/.test(candidate)) return null;

  const parsed = Number(candidate);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function metabaseServerConfig(): MetabaseServerConfig {
  const siteUrl = normalizedUrl(
    process.env.METABASE_SITE_URL || process.env.METABASE_INSTANCE_URL,
  );
  const dashboardId = normalizedDashboardId(
    process.env.METABASE_PROGRESS_DASHBOARD_ID || process.env.METABASE_DASHBOARD_ID,
  );
  const embedSecret = process.env.METABASE_EMBED_SECRET?.trim() || null;

  return {
    siteUrl,
    dashboardId,
    dashboardIdText: dashboardId ? String(dashboardId) : null,
    embedSecret,
    enabled: Boolean(siteUrl && dashboardId && embedSecret),
  };
}
