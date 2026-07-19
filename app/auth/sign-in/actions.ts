"use server";

import { auth } from "@/lib/auth/server";
import { resolveCredentialEmail } from "@/lib/auth/accounts";
import { safeReturnTo } from "@/lib/auth/redirect";

export type SignInField = "identifier" | "password" | "form";
export type SignInState = {
  error?: string;
  identifier?: string;
  field?: SignInField;
  success?: boolean;
  returnTo?: string;
} | null;

export async function signInWithIdentifier(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const identifier = String(formData.get("identifier") || "").trim().slice(0, 254);
  const password = String(formData.get("password") || "");
  const returnTo = safeReturnTo(String(formData.get("returnTo") || "/"));

  let resolved: Awaited<ReturnType<typeof resolveCredentialEmail>>;
  try {
    resolved = await resolveCredentialEmail(identifier);
  } catch {
    return { error: "Kyçja nuk është e arritshme për momentin. Provo përsëri pas pak.", identifier, field: "form" };
  }

  if (!resolved) {
    return { error: "Shkruaj username-in ose emailin e vlefshëm.", identifier, field: "identifier" };
  }

  if (password.length < 8 || password.length > 128) {
    return { error: "Password-i duhet t’i ketë 8 deri në 128 karaktere.", identifier, field: "password" };
  }

  try {
    const { error } = await auth.signIn.email({ email: resolved.email, password });
    if (error) {
      const message = `${error.code || ""} ${error.message || ""}`.toLowerCase();
      if (message.includes("rate") || message.includes("too many")) {
        return { error: "Janë bërë shumë tentativa. Prit pak dhe provo përsëri.", identifier, field: "form" };
      }
      return { error: "Username/email ose password gabim. Kontrolloji dhe provo përsëri.", identifier, field: "form" };
    }
  } catch {
    return { error: "Shërbimi i kyçjes nuk është i arritshëm për momentin. Kontrollo internetin dhe provo përsëri.", identifier, field: "form" };
  }

  return { success: true, returnTo, identifier: resolved.normalizedIdentifier };
}
