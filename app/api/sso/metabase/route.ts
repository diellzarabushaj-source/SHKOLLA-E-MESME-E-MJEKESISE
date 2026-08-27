import { createHmac } from "node:crypto";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type JwtPayload = {
  email: string;
  first_name?: string;
  last_name?: string;
  iat: number;
  exp: number;
};

function base64UrlJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signJwt(payload: JwtPayload, secret: string): string {
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const body = base64UrlJson(payload);
  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

function splitName(value: unknown): { firstName?: string; lastName?: string } {
  const parts = typeof value === "string"
    ? value.trim().split(/\s+/).filter(Boolean)
    : [];

  if (!parts.length) return {};

  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  };
}

export async function GET() {
  const { data: session } = await auth.getSession();
  const user = session?.user;

  if (!user?.email) {
    return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const secret = process.env.METABASE_JWT_SHARED_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: "METABASE_NOT_CONFIGURED" }, { status: 503 });
  }

  const { firstName, lastName } = splitName(user.name);
  const now = Math.floor(Date.now() / 1000);

  const jwt = signJwt(
    {
      email: user.email,
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      iat: now,
      exp: now + 10 * 60,
    },
    secret,
  );

  return Response.json(
    { jwt },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
