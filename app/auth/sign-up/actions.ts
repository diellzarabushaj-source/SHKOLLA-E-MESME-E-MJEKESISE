"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { safeReturnTo } from "@/lib/auth/redirect";
import { normalizeUsername, USERNAME_PATTERN, usernameToEmail } from "@/lib/auth/username";

export type SignUpField = "username" | "password" | "form";
export type SignUpState = {
  error: string;
  username?: string;
  field?: SignUpField;
} | null;

export async function signUpWithUsername(
  _previousState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const rawUsername = String(formData.get("username") || "").slice(0, 80);
  const username = normalizeUsername(rawUsername);
  const password = String(formData.get("password") || "");
  const returnTo = safeReturnTo(String(formData.get("returnTo") || "/"));

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error: "Zgjidh një username me 2–30 karaktere. Lejohen shkronja, numra, pikë, _ dhe -.",
      username,
      field: "username",
    };
  }

  if (password.length < 8 || password.length > 128) {
    return {
      error: "Password-i duhet t’i ketë 8 deri në 128 karaktere.",
      username,
      field: "password",
    };
  }

  try {
    const { error } = await auth.signUp.email({
      email: usernameToEmail(username),
      name: username,
      password,
    });

    if (error) {
      const message = `${error.code || ""} ${error.message || ""}`.toLowerCase();

      if (message.includes("already") || message.includes("exist") || message.includes("unique") || message.includes("user_already_exists")) {
        return {
          error: "Ky username ekziston. Kyçu me të ose zgjidh një username tjetër.",
          username,
          field: "username",
        };
      }

      if (message.includes("password")) {
        return {
          error: "Ky password nuk u pranua. Përdor 8–128 karaktere dhe provo përsëri.",
          username,
          field: "password",
        };
      }

      return {
        error: "Regjistrimi nuk u krye. Provo përsëri pas pak.",
        username,
        field: "form",
      };
    }
  } catch {
    return {
      error: "Shërbimi i regjistrimit nuk është i arritshëm për momentin. Provo përsëri pas pak.",
      username,
      field: "form",
    };
  }

  // Neon Auth krijon sesionin gjatë sign-up. Mos bëj një sign-in të dytë,
  // sepse dy shkrime konkurruese të cookie-t mund ta lënë sesionin pa token.
  redirect(returnTo);
}
