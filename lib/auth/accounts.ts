import "server-only";

import { neon } from "@neondatabase/serverless";
import { normalizeUsername, USERNAME_PATTERN, usernameToEmail } from "./username";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let sqlClient: ReturnType<typeof neon> | null = null;

function database() {
  if (sqlClient) return sqlClient;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  sqlClient = neon(url);
  return sqlClient;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, 254);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(value));
}

export async function credentialUsernameExists(username: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (!USERNAME_PATTERN.test(normalized)) return false;

  const rows = await database()`
    SELECT 1
    FROM neon_auth."user" AS u
    JOIN neon_auth.account AS a ON a."userId" = u.id
    WHERE lower(u.name) = ${normalized}
      AND a."providerId" = 'credential'
    LIMIT 1
  `;
  return Array.isArray(rows) && rows.length > 0;
}

export async function resolveCredentialEmail(identifier: string): Promise<{
  email: string;
  normalizedIdentifier: string;
  isEmail: boolean;
} | null> {
  const trimmed = identifier.trim().slice(0, 254);
  if (isValidEmail(trimmed)) {
    const email = normalizeEmail(trimmed);
    return { email, normalizedIdentifier: email, isEmail: true };
  }

  const username = normalizeUsername(trimmed);
  if (!USERNAME_PATTERN.test(username)) return null;

  const rows = await database()`
    SELECT u.email
    FROM neon_auth."user" AS u
    JOIN neon_auth.account AS a ON a."userId" = u.id
    WHERE lower(u.name) = ${username}
      AND a."providerId" = 'credential'
    ORDER BY u."createdAt" ASC
    LIMIT 1
  `;
  const row = Array.isArray(rows) ? rows[0] as { email?: unknown } | undefined : undefined;
  const email = typeof row?.email === "string" ? normalizeEmail(row.email) : usernameToEmail(username);
  return { email, normalizedIdentifier: username, isEmail: false };
}
