"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { authPageHref } from "@/lib/auth/redirect";
import GoogleAuthButton from "../GoogleAuthButton";
import StethoscopeLogo from "../../StethoscopeLogo";
import styles from "../auth.module.css";
import { signInWithIdentifier } from "./actions";

type NoticeTone = "info" | "success" | "warning";

type SignInFormProps = {
  returnTo: string;
  notice?: string | null;
  noticeTone?: NoticeTone;
};

export default function SignInForm({ returnTo, notice, noticeTone = "info" }: SignInFormProps) {
  const [state, formAction, isPending] = useActionState(signInWithIdentifier, null);
  const [identifier, setIdentifier] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const isRedirecting = Boolean(state?.success && state.returnTo);
  const busy = isPending || isRedirecting;

  useEffect(() => {
    if (state?.success && state.returnTo) {
      window.location.replace(state.returnTo);
      return;
    }

    if (!state?.error) return;
    if (state.identifier) setIdentifier(state.identifier);
    if (state.field === "password") passwordRef.current?.focus();
    else identifierRef.current?.focus();
  }, [state]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href={returnTo}><span aria-hidden="true">←</span> Kthehu në portal</Link>

        <section className={styles.card} aria-labelledby="sign-in-title">
          <div className={styles.brand} aria-hidden="true"><StethoscopeLogo /></div>
          <span className={styles.eyebrow}>Mirë se u ktheve</span>
          <h1 className={styles.title} id="sign-in-title">Kyçu</h1>
          <p className={styles.subtitle}>Përdor Google ose username/email dhe password. Llogaria shfaqet menjëherë në portal.</p>

          {notice && <p className={`${styles.notice} ${styles[`notice-${noticeTone}`]}`} role="status" aria-live="polite">{notice}</p>}

          <GoogleAuthButton returnTo={returnTo} mode="sign-in" disabled={busy} />
          <div className={styles.divider}>ose me password</div>

          <form action={formAction} className={styles.form} aria-busy={busy}>
            <input type="hidden" name="returnTo" value={returnTo} />

            <div className={styles.field}>
              <label className={styles.label} htmlFor="identifier">Username ose email</label>
              <input
                ref={identifierRef}
                className={`${styles.input} ${state?.field === "identifier" ? styles.inputError : ""}`}
                id="identifier"
                name="identifier"
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value.slice(0, 254))}
                maxLength={254}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="next"
                spellCheck={false}
                placeholder="p.sh. alketa03 ose email@example.com"
                aria-invalid={state?.field === "identifier" || undefined}
                disabled={busy}
                required
              />
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
                  disabled={busy}
                  required
                />
                <button className={styles.passwordToggle} type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Fshehe password-in" : "Shfaq password-in"} aria-pressed={showPassword} disabled={busy}>{showPassword ? "Fshehe" : "Shfaqe"}</button>
              </div>
              {capsLock && <span className={styles.capsLock}>Caps Lock është aktiv.</span>}
              <span className={styles.hint}><Link href={authPageHref("/auth/forgot-password", returnTo)}>E harrove password-in?</Link></span>
            </div>

            {state?.error && <p className={styles.error} role="alert" aria-live="assertive">{state.error}</p>}
            <button className={styles.submit} type="submit" disabled={busy}>
              {(isPending || isRedirecting) && <span className={styles.spinner} aria-hidden="true" />}
              <span>{isRedirecting ? "Duke hapur portalin…" : isPending ? "Duke u kyçur…" : "Kyçu"}</span>
            </button>
          </form>

          <p className={styles.switchText}>Nuk ke llogari? <Link href={authPageHref("/auth/sign-up", returnTo)}>Regjistrohu</Link></p>
          <div className={styles.divider}>ose</div>
          <Link className={styles.guest} href={returnTo}>Vazhdo pa llogari</Link>
          <p className={styles.privacy}>Administratori njihet vetëm nga emaili i autorizuar dhe verifikohet në server.</p>
        </section>
      </div>
    </main>
  );
}
