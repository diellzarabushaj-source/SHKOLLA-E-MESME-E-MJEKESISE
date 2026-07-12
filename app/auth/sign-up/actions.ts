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
    return { error: "Username: 3–20 shkronja, numra, _ ose -." };
  }

  if (password.length < 8) {
    return { error: "Password-i duhet t’i ketë së paku 8 karaktere." };
  }

  if (password.length > 128) {
    return { error: "Password-i është shumë i gjatë." };
  }

  try {
    const { error } = await auth.signUp.email({
      email: usernameToEmail(username),
      name: username,
      password,
    });

    if (error) {
      console.error("Neon Auth sign-up failed", error.message);

      const message = (error.message || "").toLowerCase();
      if (message.includes("already") || message.includes("exist") || message.includes("unique")) {
        return { error: "Ky username është i zënë. Provo një tjetër." };
      }

      return { error: "Regjistrimi dështoi. Kontrollo username-in dhe provo përsëri." };
    }
  } catch (error) {
    console.error("Neon Auth sign-up request failed", error);
    return { error: "Nuk u lidhëm me regjistrimin. Provo përsëri pas pak." };
  }

  redirect("/");
}
