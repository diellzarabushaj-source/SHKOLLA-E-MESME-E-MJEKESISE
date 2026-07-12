export const USERNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

const USER_EMAIL_DOMAIN = "shkolla.local";

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function usernameToEmail(username: string): string {
  return `${username}@${USER_EMAIL_DOMAIN}`;
}
