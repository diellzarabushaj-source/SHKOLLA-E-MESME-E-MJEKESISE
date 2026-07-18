"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { safeReturnTo } from "@/lib/auth/redirect";
import { normalizeUsername, USERNAME_PATTERN, usernameToEmail } from "@/lib/auth/username";

export type SignInField = "username" | "password" | "form";
export type SignInState = {
  error: string;
  username?: string;
  field?: SignInField;
} | null;

export async function signInWithUsername(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const rawUsername = String(formData.get("username") || "").slice(0, 80);
  const username = normalizeUsername(rawUsername);
  const password = String(formData.get("password") || "");
  const returnTo = safeReturnTo(String(formData.get("returnTo") || "/"));

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error: "Shkruaj username-in që ke përdorur gjatë regjistrimit.",
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
    const { error } = await auth.signIn.email({
      email: usernameToEmail(username),
      password,
    });

    if (error) {
      const message = `${error.code || ""} ${error.message || ""}`.toLowerCase();
      if (message.includes("rate") || message.includes("too many")) {
        return {
          error: "Janë bërë shumë tentativa. Prit pak dhe provo përsëri.",
          username,
          field: "form",
        };
      }

      return {
        error: "Username ose password gabim. Kontrolloji dhe provo përsëri.",
        username,
        field: "form",
      };
    }
  } catch {
    return {
      error: "Shërbimi i kyçjes nuk është i arritshëm për momentin. Kontrollo internetin dhe provo përsëri.",
      username,
      field: "form",
    };
  }

  redirect(returnTo);
}
