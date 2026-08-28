"use client";

import { Alert, Button } from "antd";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { authPageHref } from "@/lib/auth/redirect";
import styles from "./auth.module.css";

type GoogleAuthButtonProps = {
  returnTo: string;
  mode: "sign-in" | "sign-up";
  disabled?: boolean;
};

export default function GoogleAuthButton({ returnTo, mode, disabled = false }: GoogleAuthButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function continueWithGoogle() {
    setError("");
    setPending(true);

    try {
      const authPath = mode === "sign-up" ? "/auth/sign-up" : "/auth/sign-in";
      const errorCallbackURL = `${authPageHref(authPath, returnTo)}&reason=google`;
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: returnTo,
        errorCallbackURL,
      });

      if (result.error) {
        setError("Lidhja me Google nuk u nis. Provo përsëri.");
        setPending(false);
      }
    } catch {
      setError("Nuk u lidhëm me Google. Kontrollo internetin dhe provo përsëri.");
      setPending(false);
    }
  }

  return (
    <>
      <Button
        className={styles.googleButton}
        type="default"
        block
        size="large"
        onClick={continueWithGoogle}
        disabled={disabled || pending}
        loading={pending}
        icon={!pending ? (
          <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.36l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.55l3.35-2.62Z" />
            <path fill="#EA4335" d="M12 5.94c1.47 0 2.78.5 3.82 1.49l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
          </svg>
        ) : undefined}
      >
        {pending ? "Duke u lidhur…" : mode === "sign-up" ? "Regjistrohu me Google" : "Vazhdo me Google"}
      </Button>
      {error && <Alert className={styles.error} type="error" message={error} showIcon role="alert" />}
    </>
  );
}
