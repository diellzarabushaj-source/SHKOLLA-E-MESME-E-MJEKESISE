import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { metabaseServerConfig } from "@/lib/metabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store" };

function base64Url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;
  const signature = createHmac("sha256", secret)
    .update(unsigned)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsigned}.${signature}`;
}

export async function POST(request: Request) {
  const config = metabaseServerConfig();
  const secret = config.embedSecret;
  const configuredDashboardId = config.dashboardId;

  if (!secret || !configuredDashboardId) {
    return NextResponse.json(
      { error: "METABASE_NOT_CONFIGURED" },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED" },
      { status: 401, headers: noStoreHeaders },
    );
  }

  const body = await request.json().catch(() => null) as {
    entityType?: unknown;
    entityId?: unknown;
  } | null;

  const entityType = body?.entityType;
  const entityId = Number(body?.entityId);

  // The browser controls entityType/entityId. Never sign an arbitrary resource.
  if (
    entityType !== "dashboard"
    || !Number.isSafeInteger(entityId)
    || entityId !== configuredDashboardId
  ) {
    return NextResponse.json(
      { error: "METABASE_RESOURCE_FORBIDDEN" },
      { status: 403, headers: noStoreHeaders },
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const jwt = signJwt(
    {
      resource: { dashboard: configuredDashboardId },
      params: {
        // This must match a LOCKED parameter named "user_id" in Metabase.
        user_id: [userId],
      },
      iat: now,
      exp: now + 10 * 60,
    },
    secret,
  );

  return NextResponse.json({ jwt }, { headers: noStoreHeaders });
}
