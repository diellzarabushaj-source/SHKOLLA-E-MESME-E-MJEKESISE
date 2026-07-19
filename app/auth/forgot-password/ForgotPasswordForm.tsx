"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { authPageHref } from "@/lib/auth/redirect";
import StethoscopeLogo from "../../StethoscopeLogo";
import styles from "../auth.module.css";

export default function ForgotPasswordForm({ returnTo }: { returnTo: string }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const redirectTo = `${window.location.origin}${authPageHref("/auth/reset-password", returnTo)}`;
      const result = await authClient.requestPasswordReset({ email: email.trim().toLowerCase(), redirectTo });
      if (result.error) setError("Emaili nuk u dërgua. Kontrollo adresën dhe provo përsëri.");
      else setSent(true);
    } catch {
      setError("Shërbimi nuk është i arritshëm për momentin. Provo përsëri pas pak.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href={authPageHref("/auth/sign-in", returnTo)}><span aria-hidden="true">←</span> Kthehu te kyçja</Link>
        <section className={styles.card} aria-labelledby="forgot-password-title">
          <div className={styles.brand} aria-hidden="true"><StethoscopeLogo /></div>
          <span className={styles.eyebrow}>Rikuperimi i llogarisë</span>
          <h1 className={styles.title} id="forgot-password-title">Rikthe password-in</h1>
          <p className={styles.subtitle}>Shkruaj emailin që e ke shtuar në llogari. Do të marrësh një link të sigurt për password të ri.</p>

          {sent ? (
            <>
              <p className={`${styles.notice} ${styles["notice-success"]}`} role="status">Nëse emaili lidhet me një llogari, linku për rikthim është dërguar. Kontrollo edhe Spam/Junk.</p>
              <Link className={styles.guest} href={authPageHref("/auth/sign-in", returnTo)}>Kthehu te kyçja</Link>
            </>
          ) : (
            <form className={styles.form} onSubmit={submit} aria-busy={pending}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="recovery-email">Emaili i llogarisë</label>
                <input className={styles.input} id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value.slice(0, 254))} maxLength={254} autoComplete="email" autoCapitalize="none" placeholder="email@example.com" disabled={pending} required />
                <span className={styles.hint}>Llogaritë e krijuara pa email nuk mund të rikuperohen automatikisht.</span>
              </div>
              {error && <p className={styles.error} role="alert" aria-live="assertive">{error}</p>}
              <button className={styles.submit} type="submit" disabled={pending}>{pending && <span className={styles.spinner} aria-hidden="true" />}<span>{pending ? "Duke dërguar…" : "Dërgo linkun"}</span></button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
