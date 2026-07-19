"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { authPageHref } from "@/lib/auth/redirect";
import StethoscopeLogo from "../../StethoscopeLogo";
import styles from "../auth.module.css";

export default function ResetPasswordForm({
  token,
  invalidToken,
  returnTo,
}: {
  token: string;
  invalidToken: boolean;
  returnTo: string;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const passwordsMatch = useMemo(() => Boolean(confirmPassword) && password === confirmPassword, [confirmPassword, password]);
  const unusableToken = invalidToken || !token;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8 || password.length > 128) {
      setError("Password-i duhet t’i ketë 8 deri në 128 karaktere.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password-at nuk përputhen.");
      return;
    }

    setPending(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setError("Linku ka skaduar ose nuk është i vlefshëm. Kërko një link të ri.");
        setPending(false);
        return;
      }
      window.location.replace(`${authPageHref("/auth/sign-in", returnTo)}&reset=1`);
    } catch {
      setError("Password-i nuk u ndryshua. Provo përsëri pas pak.");
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href={authPageHref("/auth/sign-in", returnTo)}><span aria-hidden="true">←</span> Kthehu te kyçja</Link>
        <section className={styles.card} aria-labelledby="reset-password-title">
          <div className={styles.brand} aria-hidden="true"><StethoscopeLogo /></div>
          <span className={styles.eyebrow}>Siguria e llogarisë</span>
          <h1 className={styles.title} id="reset-password-title">Password i ri</h1>

          {unusableToken ? (
            <>
              <p className={`${styles.notice} ${styles["notice-warning"]}`} role="alert">Linku nuk është i vlefshëm ose ka skaduar.</p>
              <Link className={styles.guest} href={authPageHref("/auth/forgot-password", returnTo)}>Kërko link të ri</Link>
            </>
          ) : (
            <form className={styles.form} onSubmit={submit} aria-busy={pending}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="new-password">Password-i i ri</label>
                <div className={styles.passwordField}>
                  <input className={styles.input} id="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value.slice(0, 128))} minLength={8} maxLength={128} autoComplete="new-password" placeholder="Së paku 8 karaktere" disabled={pending} required />
                  <button className={styles.passwordToggle} type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Fshehi password-at" : "Shfaqi password-at"} aria-pressed={showPassword} disabled={pending}>{showPassword ? "Fshehi" : "Shfaqi"}</button>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="confirm-new-password">Përsërite password-in</label>
                <input className={styles.input} id="confirm-new-password" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value.slice(0, 128))} minLength={8} maxLength={128} autoComplete="new-password" aria-invalid={confirmPassword && !passwordsMatch || undefined} disabled={pending} required />
                <span className={!confirmPassword ? styles.hint : passwordsMatch ? styles.usernamePreview : styles.capsLock} aria-live="polite">{!confirmPassword ? "Shkruaje edhe një herë." : passwordsMatch ? "Password-at përputhen." : "Password-at nuk përputhen."}</span>
              </div>
              {error && <p className={styles.error} role="alert" aria-live="assertive">{error}</p>}
              <button className={styles.submit} type="submit" disabled={pending}>{pending && <span className={styles.spinner} aria-hidden="true" />}<span>{pending ? "Duke ruajtur…" : "Ruaj password-in e ri"}</span></button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
