"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { authClient } from "@/lib/auth/client";
import StethoscopeLogo from "../../StethoscopeLogo";
import styles from "../auth.module.css";
import { signInWithUsername } from "./actions";

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signInWithUsername, null);
  const [showPassword, setShowPassword] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [isGooglePending, setIsGooglePending] = useState(false);

  async function signInAdminWithGoogle() {
    setGoogleError("");
    setIsGooglePending(true);

    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/auth/sign-in",
      });

      if (error) {
        setGoogleError("Google Sign-In nuk u aktivizua. Provo përsëri.");
        setIsGooglePending(false);
      }
    } catch {
      setGoogleError("Nuk u lidhëm me Google. Provo përsëri pas pak.");
      setIsGooglePending(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/">
          <span aria-hidden="true">←</span> Kthehu në portal
        </Link>

        <section className={styles.card} aria-labelledby="sign-in-title">
          <div className={styles.brand} aria-hidden="true"><StethoscopeLogo /></div>
          <span className={styles.eyebrow}>Mirë se u ktheve</span>
          <h1 className={styles.title} id="sign-in-title">Kyçu</h1>
          <p className={styles.subtitle}>Administratori kyçet me Google; nxënësit me username dhe password.</p>

          <button
            className={styles.googleButton}
            type="button"
            onClick={signInAdminWithGoogle}
            disabled={isGooglePending}
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.36l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
              <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.55l3.35-2.62Z" />
              <path fill="#EA4335" d="M12 5.94c1.47 0 2.78.5 3.82 1.49l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
            </svg>
            {isGooglePending ? "Duke u lidhur me Google..." : "Admini — Kyçu me Google"}
          </button>
          <p className={styles.adminHint}>Vetëm llogaria e verifikuar e administratorit merr qasje në editor.</p>
          {googleError && <p className={styles.error} role="alert" aria-live="polite">{googleError}</p>}

          <div className={styles.divider}>hyrja e nxënësve</div>

          <form action={formAction} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">Username</label>
              <input
                className={styles.input}
                id="username"
                name="username"
                type="text"
                maxLength={40}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Username"
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Password</label>
              <div className={styles.passwordField}>
                <input
                  className={styles.input}
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  maxLength={128}
                  autoComplete="current-password"
                  placeholder="Password"
                  required
                />
                <button
                  className={styles.passwordToggle}
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Fshehe password-in" : "Shfaq password-in"}
                >
                  {showPassword ? "Fshehe" : "Shfaqe"}
                </button>
              </div>
            </div>

            {state?.error && <p className={styles.error} role="alert" aria-live="polite">{state.error}</p>}

            <button className={styles.submit} type="submit" disabled={isPending}>
              {isPending ? "Duke u kyçur..." : "Kyçu"}
            </button>
          </form>

          <p className={styles.switchText}>Nuk ke llogari? <Link href="/auth/sign-up">Regjistrohu</Link></p>
          <div className={styles.divider}>ose</div>
          <Link className={styles.guest} href="/">Vazhdo pa llogari</Link>
        </section>
      </div>
    </main>
  );
}
