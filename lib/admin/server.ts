import "server-only";

import { auth } from "@/lib/auth/server";

export const ADMIN_EMAIL = "diellorrabushaj4@gmail.com";
const ADMIN_PROVIDER = "google";

type SessionUser = {
  id?: string;
  email?: string;
  emailVerified?: boolean;
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
  return Boolean(
    user?.id
    && user.emailVerified === true
    && normalized(user.email) === ADMIN_EMAIL,
  );
}

async function hasGoogleOnlyAccount(userId: string): Promise<boolean> {
  const { data: accounts, error } = await auth.listAccounts();
  if (error || !Array.isArray(accounts)) return false;

  const providers = accounts
    .filter((account) => account.userId === userId)
    .map((account) => normalized(account.providerId));

  // Fail closed if a password or another provider is ever linked to the
  // administrator. This keeps admin access tied to the Google identity.
  return providers.length === 1 && providers[0] === ADMIN_PROVIDER;
}

export async function currentSessionUser(): Promise<SessionUser | null> {
  const { data } = await auth.getSession();
  return sessionUser(data);
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const user = await currentSessionUser();
    return Boolean(
      isAdminIdentity(user)
      && user?.id
      && await hasGoogleOnlyAccount(user.id),
    );
  } catch {
    return false;
  }
}

export async function requireAdminUser(): Promise<SessionUser> {
  const user = await currentSessionUser();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  if (!isAdminIdentity(user) || !await hasGoogleOnlyAccount(user.id)) {
    throw new Error("ADMIN_REQUIRED");
  }
  return user;
}
