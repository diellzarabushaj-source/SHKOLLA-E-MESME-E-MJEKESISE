import "server-only";

import { auth } from "@/lib/auth/server";
import { usernameToEmail } from "@/lib/auth/username";

export const ADMIN_EMAIL = "diellorrabushaj4@gmail.com";
const ADMIN_USERNAME = "diellorrabushaj4";
const ADMIN_INTERNAL_EMAIL = usernameToEmail(ADMIN_USERNAME);

type SessionUser = {
  id?: string;
  email?: string;
  name?: string;
};

function normalized(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function sessionUser(data: unknown): SessionUser | null {
  if (!data || typeof data !== "object") return null;
  const value = data as { user?: SessionUser; session?: { user?: SessionUser } };
  return value.user || value.session?.user || null;
}

export function isAdminIdentity(user: SessionUser | null | undefined): boolean {
  if (!user) return false;
  const email = normalized(user.email);
  const username = normalized(user.name);

  // The public login currently maps usernames to an internal Neon Auth email.
  // The Gmail address remains the canonical admin identity; the exact internal
  // alias is accepted only together with the exact admin username.
  return email === ADMIN_EMAIL
    || (email === ADMIN_INTERNAL_EMAIL && username === ADMIN_USERNAME);
}

export async function currentSessionUser(): Promise<SessionUser | null> {
  const { data } = await auth.getSession();
  return sessionUser(data);
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    return isAdminIdentity(await currentSessionUser());
  } catch {
    return false;
  }
}

export async function requireAdminUser(): Promise<SessionUser> {
  const user = await currentSessionUser();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  if (!isAdminIdentity(user)) throw new Error("ADMIN_REQUIRED");
  return user;
}
