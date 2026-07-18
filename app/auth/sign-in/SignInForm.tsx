"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { authPageHref } from "@/lib/auth/redirect";
import { normalizeUsername } from "@/lib/auth/username";
import StethoscopeLogo from "../../StethoscopeLogo";
import styles from "../auth.module.css";
import { signInWithUsername } from "./actions";

type NoticeTone = "info" | "success" | "warning";

type SignInFormProps = {
  returnTo: string;
  notice?: string | null;
  noticeTone?: NoticeTone;
};

export default function SignInForm({ returnTo, notice, noticeTone = "info" }: SignInFormProps) {
  const [state, formAction, isPending] = useActionState(signInWithUsername, null);
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [isGooglePending, setIsGooglePending] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const busy = isPending || isGooglePending;

  useEffect(() => {
    if (!state?.error) return;
    if (state.username) setUsername(state.username);
    if (state.field === "password") passwordRef.current?.focus();
    else usernameRef.current?.focus();
  }, [state]);

  async function signInAdminWithGoogle() {
    setGoogleError("");
    setIsGooglePending(true);

    try {
      const errorCallbackURL = `${authPageHref("/auth/sign-in", returnTo)}&reason=google`;
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: returnTo,
        errorCallbackURL,
      });

      if (error) {
        setGoogleError("Kyçja me Google nuk u nis. Provo përsëri.");
        setIsGooglePending(false);
      }
    } catch {
      setGoogleError("Nuk u lidhëm me Google. Kontrollo internetin dhe provo përsëri.");
      setIsGooglePending(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href={returnTo}>
          <span aria-hidden="true">←</span> Kthehu në portal
        </Link>

        <section className={styles.card} aria-labelledby="sign-in-title">
          <div className={styles.brand} aria-hidden="true"><StethoscopeLogo /></div>
          <span className={styles.eyebrow}>Mirë se u ktheve</span>
          <h1 className={styles.title} id="sign-in-title">Kyçu</h1>
          <p className={styles.subtitle}>Hape progresin, shënimet dhe mësimet e tua me llogarinë personale.</p>

          {notice && (
            <p className={`${styles.notice} ${styles[`notice-${noticeTone}`]}`} role="status" aria-live="polite">
              {notice}
            </p>
          )}

          <form action={formAction} className={styles.form} aria-busy={isPending}>
            <input type="hidden" name="returnTo" value={returnTo} />

            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">Username</label>
              <input
                ref={usernameRef}
                className={`${styles.input} ${state?.field === "username" ? styles.inputError : ""}`}
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value.slice(0, 80))}
                minLength={2}
                maxLength={80}
                autoComplete="username"
                autoCapitalize="none"
                enterKeyHint="next"
                spellCheck={false}
                placeholder="p.sh. alketa03"
                aria-invalid={state?.field === "username" || undefined}
                aria-describedby="sign-in-username-hint"
                disabled={busy}
                required
              />
              <span className={styles.hint} id="sign-in-username-hint">
                Shkruaje siç e mban mend; hapësirat dhe ë/ç rregullohen automatikisht.
              </span>
              {username.trim() && normalizedUsername && (
                <span className={styles.usernamePreview} aria-live="polite">
                  Do të përdoret <b>@{normalizedUsername}</b>
                </span>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Password</label>
              <div className={styles.passwordField}>
                <input
                  ref={passwordRef}
                  className={`${styles.input} ${state?.field === "password" ? styles.inputError : ""}`}
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  maxLength={128}
                  autoComplete="current-password"
                  enterKeyHint="go"
                  placeholder="Password-i yt"
                  onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
                  onBlur={() => setCapsLock(false)}
                  aria-invalid={state?.field === "password" || undefined}
                  aria-describedby={capsLock ? "sign-in-caps-lock" : undefined}
                  disabled={busy}
                  required
                />
                <button
                  className={styles.passwordToggle}
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Fshehe password-in" : "Shfaq password-in"}
                  aria-pressed={showPassword}
                  disabled={busy}
                >
                  {showPassword ? "Fshehe" : "Shfaqe"}
                </button>
              </div>
              {capsLock && <span className={styles.capsLock} id="sign-in-caps-lock">Caps Lock është aktiv.</span>}
            </div>

            {state?.error && <p className={styles.error} role="alert" aria-live="assertive">{state.error}</p>}

            <button className={styles.submit} type="submit" disabled={busy}>
              {isPending && <span className={styles.spinner} aria-hidden="true" />}
              <span>{isPending ? "Duke u kyçur..." : "Kyçu"}</span>
            </button>
          </form>

          <p className={styles.switchText}>
            Nuk ke llogari? <Link href={authPageHref("/auth/sign-up", returnTo)}>Regjistrohu</Link>
          </p>

          <div className={styles.divider}>ose, për administratorin</div>

          <button
            className={styles.googleButton}
            type="button"
            onClick={signInAdminWithGoogle}
            disabled={busy}
          >
            {isGooglePending ? (
              <span className={styles.spinnerDark} aria-hidden="true" />
            ) : (
              <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
                <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.36l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
                <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.55l3.35-2.62Z" />
                <path fill="#EA4335" d="M12 5.94c1.47 0 2.78.5 3.82 1.49l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
              </svg>
            )}
            <span>{isGooglePending ? "Duke u lidhur..." : "Admini — Kyçu me Google"}</span>
          </button>
          <p className={styles.adminHint}>Qasja e administratorit verifikohet përsëri në server para çdo ndryshimi.</p>
          {googleError && <p className={styles.error} role="alert" aria-live="assertive">{googleError}</p>}

          <div className={styles.divider}>ose</div>
          <Link className={styles.guest} href={returnTo}>Vazhdo pa llogari</Link>
          <p className={styles.privacy}>Sesioni dhe progresi yt janë privatë dhe nuk ruhen në cache publike.</p>
        </section>
      </div>
    </main>
  );
}
