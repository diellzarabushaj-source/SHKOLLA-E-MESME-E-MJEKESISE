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

  if (password.length < 8 || password.length > 128) {
    return { error: "Password-i duhet t’i ketë 8 deri në 128 karaktere.", username };
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
  } catch (error) {
    console.error("Registration request failed", error);
    return { error: "Regjistrimi nuk u krye. Provo përsëri pas pak.", username };
  }

  // Neon Auth e krijon sesionin gjatë sign-up. Një sign-in i dytë në të njëjtën
  // server action mund të shkruajë cookies konkurruese dhe të krijojë sesion pa token.
  redirect("/");
}
