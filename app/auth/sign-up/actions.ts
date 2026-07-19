"use server";

import { auth } from "@/lib/auth/server";
import { credentialUsernameExists, isValidEmail, normalizeEmail } from "@/lib/auth/accounts";
import { safeReturnTo } from "@/lib/auth/redirect";
import { normalizeUsername, USERNAME_PATTERN, usernameToEmail } from "@/lib/auth/username";

export type SignUpField = "username" | "email" | "password" | "confirmPassword" | "form";
export type SignUpState = {
  error?: string;
  username?: string;
  email?: string;
  field?: SignUpField;
  success?: boolean;
  returnTo?: string;
} | null;

export async function signUpWithUsername(
  _previousState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const rawUsername = String(formData.get("username") || "").slice(0, 80);
  const username = normalizeUsername(rawUsername);
  const rawEmail = String(formData.get("email") || "").trim().slice(0, 254);
  const email = rawEmail ? normalizeEmail(rawEmail) : "";
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const returnTo = safeReturnTo(String(formData.get("returnTo") || "/"));

  if (!USERNAME_PATTERN.test(username)) {
    return { error: "Zgjidh një username me 2–30 karaktere. Lejohen shkronja, numra, pikë, _ dhe -.", username, email, field: "username" };
  }

  if (email && !isValidEmail(email)) {
    return { error: "Shkruaj një email të vlefshëm ose lëre fushën bosh.", username, email, field: "email" };
  }

  if (password.length < 8 || password.length > 128) {
    return { error: "Password-i duhet t’i ketë 8 deri në 128 karaktere.", username, email, field: "password" };
  }

  if (password !== confirmPassword) {
    return { error: "Password-at nuk përputhen. Shkruaje të njëjtin password në të dy fushat.", username, email, field: "confirmPassword" };
  }

  try {
    if (await credentialUsernameExists(username)) {
      return { error: "Ky username ekziston. Kyçu me të ose zgjidh një username tjetër.", username, email, field: "username" };
    }

    const { error } = await auth.signUp.email({
      email: email || usernameToEmail(username),
      name: username,
      password,
    });

    if (error) {
      const message = `${error.code || ""} ${error.message || ""}`.toLowerCase();
      if (message.includes("already") || message.includes("exist") || message.includes("unique") || message.includes("user_already_exists")) {
        return {
          error: email ? "Ky email ose username është përdorur. Kyçu ose përdor të dhëna të tjera." : "Ky username ekziston. Kyçu me të ose zgjidh një tjetër.",
          username,
          email,
          field: email ? "email" : "username",
        };
      }
      if (message.includes("rate") || message.includes("too many")) {
        return { error: "Janë bërë shumë tentativa. Prit pak dhe provo përsëri.", username, email, field: "form" };
      }
      if (message.includes("password")) {
        return { error: "Ky password nuk u pranua. Përdor 8–128 karaktere dhe provo përsëri.", username, email, field: "password" };
      }
      return { error: "Regjistrimi nuk u krye. Provo përsëri pas pak.", username, email, field: "form" };
    }
  } catch {
    return { error: "Shërbimi i regjistrimit nuk është i arritshëm për momentin. Kontrollo internetin dhe provo përsëri.", username, email, field: "form" };
  }

  return { success: true, returnTo, username, email };
}
