"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { normalizeUsername, USERNAME_PATTERN, usernameToEmail } from "@/lib/auth/username";

export type SignInState = { error: string } | null;

export async function signInWithUsername(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const username = normalizeUsername(String(formData.get("username") || ""));
  const password = String(formData.get("password") || "");

  if (!USERNAME_PATTERN.test(username) || password.length < 8) {
    return { error: "Username ose password gabim." };
  }

  try {
    const { error } = await auth.signIn.email({
      email: usernameToEmail(username),
      password,
    });

    if (error) return { error: "Username ose password gabim." };
  } catch (error) {
    console.error("Neon Auth sign-in request failed", error);
    return { error: "Nuk u lidhëm me kyçjen. Provo përsëri pas pak." };
  }

  redirect("/");
}
