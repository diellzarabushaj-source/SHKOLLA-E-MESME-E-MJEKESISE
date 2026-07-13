"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { normalizeUsername, USERNAME_PATTERN, usernameToEmail } from "@/lib/auth/username";

export type SignUpState = { error: string; username?: string } | null;

export async function signUpWithUsername(
  _previousState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const username = normalizeUsername(String(formData.get("username") || ""));
  const password = String(formData.get("password") || "");

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error: "Shkruaj së paku 2 shkronja ose numra për username.",
      username,
    };
  }

  if (password.length < 8) {
    return {
      error: "Password-i duhet t’i ketë së paku 8 karaktere.",
      username,
    };
  }

  if (password.length > 128) {
    return { error: "Password-i është shumë i gjatë.", username };
  }

  try {
    const { error } = await auth.signUp.email({
      email: usernameToEmail(username),
      name: username,
      password,
    });

    if (error) {
      console.error("Neon Auth sign-up failed", error.code, error.message);
      const message = `${error.code || ""} ${error.message || ""}`.toLowerCase();

      if (message.includes("already") || message.includes("exist") || message.includes("unique") || message.includes("user_already_exists")) {
        return { error: "Ky username është i zënë. Zgjidh një tjetër.", username };
      }

      if (message.includes("password")) {
        return { error: "Përdor një password me së paku 8 karaktere.", username };
      }

      return {
        error: "Regjistrimi nuk u krye. Provo një username tjetër dhe shtyp përsëri.",
        username,
      };
    }
  } catch (error) {
    console.error("Neon Auth sign-up request failed", error);
    return {
      error: "Lidhja me regjistrimin dështoi. Provo përsëri pas pak.",
      username,
    };
  }

  redirect("/");
}
