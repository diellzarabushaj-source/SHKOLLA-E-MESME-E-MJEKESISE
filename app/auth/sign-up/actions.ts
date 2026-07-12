"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { normalizeUsername, USERNAME_PATTERN, usernameToEmail } from "@/lib/auth/username";

export type SignUpState = { error: string } | null;

export async function signUpWithUsername(
  _previousState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const username = normalizeUsername(String(formData.get("username") || ""));
  const password = String(formData.get("password") || "");

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error: "Username duhet t’i ketë 3–20 karaktere: shkronja, numra, _ ose -.",
    };
  }

  if (password.length < 8) {
    return { error: "Password-i duhet t’i ketë së paku 8 karaktere." };
  }

  if (password.length > 128) {
    return { error: "Password-i është shumë i gjatë." };
  }

  const { error } = await auth.signUp.email({
    email: usernameToEmail(username),
    name: username,
    password,
  });

  if (error) {
    const message = (error.message || "").toLowerCase();
    if (message.includes("already") || message.includes("exist") || message.includes("unique")) {
      return { error: "Ky username është i zënë. Provo një tjetër." };
    }

    return { error: "Llogaria nuk u krijua. Provo përsëri." };
  }

  redirect("/");
}
