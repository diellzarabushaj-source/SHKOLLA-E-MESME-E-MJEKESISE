import { neon } from "@neondatabase/serverless";
import { requireAdminUser } from "@/lib/admin/server";
import { metabaseServerConfig } from "@/lib/metabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requiredViews = [
  "progress_cards",
  "progress_daily",
  "progress_lessons",
  "progress_overview",
  "progress_ratings",
  "progress_subjects",
  "progress_weekly",
] as const;

export async function GET() {
  try {
    await requireAdminUser();
  } catch (error) {
    const code = error instanceof Error ? error.message : "ADMIN_REQUIRED";
    return Response.json(
      { error: code },
      { status: code === "AUTH_REQUIRED" ? 401 : 403 },
    );
  }

  const config = metabaseServerConfig();
  const siteUrl = config.siteUrl;
  const siteConfigured = Boolean(siteUrl);
  const dashboardConfigured = Boolean(config.dashboardId);
  const embedSecretConfigured = Boolean(config.embedSecret);

  let analyticsViews: string[] = [];
  let analyticsReady = false;
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    try {
      const sql = neon(databaseUrl);
      const rows = await sql`
        SELECT table_name
        FROM information_schema.views
        WHERE table_schema = 'analytics'
        ORDER BY table_name
      `;
      analyticsViews = rows
        .map((row) => String(row.table_name || ""))
        .filter(Boolean);
      analyticsReady = requiredViews.every((view) => analyticsViews.includes(view));
    } catch {
      analyticsViews = [];
      analyticsReady = false;
    }
  }

  let metabaseReachable: boolean | null = null;
  if (siteConfigured) {
    try {
      const response = await fetch(`${siteUrl}/api/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      metabaseReachable = response.ok;
    } catch {
      metabaseReachable = false;
    }
  }

  const missing: string[] = [];
  if (!siteConfigured) missing.push("METABASE_SITE_URL");
  if (!dashboardConfigured) missing.push("METABASE_PROGRESS_DASHBOARD_ID");
  if (!embedSecretConfigured) missing.push("METABASE_EMBED_SECRET");
  if (!analyticsReady) missing.push("analytics schema");
  if (siteConfigured && metabaseReachable === false) missing.push("Metabase service");

  return Response.json(
    {
      configured: siteConfigured && dashboardConfigured && embedSecretConfigured && analyticsReady,
      siteConfigured,
      dashboardConfigured,
      embedSecretConfigured,
      analyticsReady,
      metabaseReachable,
      missing,
      analyticsViews,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
