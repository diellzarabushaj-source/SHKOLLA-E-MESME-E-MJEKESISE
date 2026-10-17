export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA || "mobile-webapp-v1" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
