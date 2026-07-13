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
    return { error: "Shkruaj një username me së paku 2 karaktere.", username };
  }

  // Neon Auth kërkon 8 karaktere, por nuk kërkojmë shkronja të mëdha,
  // numra ose simbole të veçanta.
  if (password.length < 8) {
    return { error: "Password-i duhet t’i ketë vetëm së paku 8 karaktere.", username };
  }

  const email = usernameToEmail(username);

  try {
    const { error } = await auth.signUp.email({
      email,
      name: username,
      password,
    });

    if (error) {
      const message = `${error.code || ""} ${error.message || ""}`.toLowerCase();

      if (message.includes("already") || message.includes("exist") || message.includes("unique") || message.includes("user_already_exists")) {
        return { error: "Ky username ekziston. Kyçu ose zgjidh një tjetër.", username };
      }

      if (message.includes("password")) {
        return { error: "Përdor së paku 8 karaktere për password.", username };
      }

      return { error: "Regjistrimi nuk u krye. Provo përsëri.", username };
    }

    // E kyçim menjëherë nxënësin, që të mos ketë hap tjetër pas regjistrimit.
    const { error: signInError } = await auth.signIn.email({ email, password });
    if (signInError) redirect("/auth/sign-in?created=1");
  } catch (error) {
    console.error("Registration request failed", error);
    return { error: "Regjistrimi nuk u krye. Provo përsëri pas pak.", username };
  }

  redirect("/");
}
