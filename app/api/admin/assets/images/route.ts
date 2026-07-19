import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/server";
import { getSanityWriteClient } from "@/lib/sanity/write-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function firstForwardedValue(value: string | null): string {
  return value?.split(",")[0]?.trim() || "";
}

function isSameOriginRequest(request: Request): boolean {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return false;

  try {
    const origin = new URL(originHeader);
    const requestUrl = new URL(request.url);
    const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
    const directHost = request.headers.get("host")?.trim() || "";
    const allowedHosts = new Set(
      [requestUrl.host, forwardedHost, directHost]
        .filter(Boolean)
        .map((host) => host.toLowerCase()),
    );
    const forwardedProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto"));
    const allowedProtocols = new Set(
      [requestUrl.protocol, forwardedProtocol ? `${forwardedProtocol.toLowerCase()}:` : ""]
        .filter(Boolean),
    );

    return allowedHosts.has(origin.host.toLowerCase())
      && allowedProtocols.has(origin.protocol.toLowerCase());
  } catch {
    return false;
  }
}

function safeFilename(value: string): string {
  const normalized = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return (normalized || `foto-${Date.now()}`).slice(0, 180);
}

function sanityStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const value = error as {
    statusCode?: unknown;
    response?: { statusCode?: unknown; status?: unknown };
  };
  const status = Number(value.statusCode ?? value.response?.statusCode ?? value.response?.status);
  return Number.isInteger(status) ? status : null;
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return jsonError("INVALID_ORIGIN", 403);
    await requireAdminUser();

    const formData = await request.formData().catch(() => null);
    const image = formData?.get("image");
    if (!(image instanceof File)) return jsonError("IMAGE_REQUIRED", 400);
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) return jsonError("IMAGE_TYPE_NOT_ALLOWED", 415);
    if (image.size <= 0) return jsonError("IMAGE_EMPTY", 400);
    if (image.size > MAX_IMAGE_BYTES) return jsonError("IMAGE_TOO_LARGE", 413);

    const client = getSanityWriteClient();
    const asset = await client.assets.upload("image", image, {
      filename: safeFilename(image.name),
      contentType: image.type,
    });

    return NextResponse.json(
      {
        asset: {
          _id: asset._id,
          url: asset.url,
          originalFilename: asset.originalFilename || image.name,
          mimeType: asset.mimeType || image.type,
          size: asset.size || image.size,
          metadata: asset.metadata
            ? {
                dimensions: asset.metadata.dimensions
                  ? {
                      width: asset.metadata.dimensions.width,
                      height: asset.metadata.dimensions.height,
                      aspectRatio: asset.metadata.dimensions.aspectRatio,
                    }
                  : undefined,
              }
            : undefined,
        },
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "AUTH_REQUIRED") return jsonError("AUTH_REQUIRED", 401);
      if (error.message === "ADMIN_REQUIRED") return jsonError("ADMIN_REQUIRED", 403);
      if (error.message === "SANITY_WRITE_TOKEN_MISSING") return jsonError("EDITOR_NOT_CONFIGURED", 503);
    }

    const status = sanityStatusCode(error);
    if (status === 401 || status === 403) return jsonError("EDITOR_TOKEN_INVALID", 503);
    console.error("Admin image upload failed", error);
    return jsonError("IMAGE_UPLOAD_FAILED", 500);
  }
}
