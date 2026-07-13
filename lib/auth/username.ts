export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,29}$/;

// Neon Auth uses email/password internally. Students only see a username;
// this valid synthetic address is never shown and no email is sent.
const USER_EMAIL_DOMAIN = "users.mjekesi-peje.com";

export function normalizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .replace(/[._-]{2,}/g, "-")
    .slice(0, 30);
}

export function usernameToEmail(username: string): string {
  return `${username}@${USER_EMAIL_DOMAIN}`;
}
