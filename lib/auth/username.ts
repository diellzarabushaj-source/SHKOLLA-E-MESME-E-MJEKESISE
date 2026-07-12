export const USERNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

// Neon Auth uses email/password internally. Students only see a username;
// this valid synthetic address is never shown and no email is sent.
const USER_EMAIL_DOMAIN = "users.mjekesi-peje.com";

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function usernameToEmail(username: string): string {
  return `${username}@${USER_EMAIL_DOMAIN}`;
}
