export type ReturnToValue = string | string[] | null | undefined;

const FALLBACK_PATH = "/";
const AUTH_PATHS = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/reset-password",
];
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function safeReturnTo(value: ReturnToValue, fallback = FALLBACK_PATH): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return fallback;

  const candidate = raw.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || CONTROL_CHARACTERS.test(candidate)) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(candidate);
    if (decoded.startsWith("//") || decoded.includes("\\") || CONTROL_CHARACTERS.test(decoded)) return fallback;

    const parsed = new URL(candidate, "https://portal.invalid");
    if (parsed.origin !== "https://portal.invalid") return fallback;

    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (AUTH_PATHS.some((path) => normalized === path || normalized.startsWith(`${path}?`) || normalized.startsWith(`${path}#`))) {
      return fallback;
    }
    if (normalized === "/api" || normalized.startsWith("/api/")) return fallback;

    return normalized || fallback;
  } catch {
    return fallback;
  }
}

export type AuthPagePath = "/auth/sign-in" | "/auth/sign-up" | "/auth/forgot-password" | "/auth/reset-password";

export function authPageHref(path: AuthPagePath, returnTo: string): string {
  const safePath = safeReturnTo(returnTo);
  return `${path}?returnTo=${encodeURIComponent(safePath)}`;
}
