"use client";

import Link from "next/link";
import { useActionState } from "react";
import styles from "../auth.module.css";
import { signUpWithUsername } from "./actions";

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpWithUsername, null);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/">
          <span aria-hidden="true">←</span> Kthehu te flashcards
        </Link>

        <section className={styles.card} aria-labelledby="sign-up-title">
          <div className={styles.brand} aria-hidden="true">M+</div>
          <span className={styles.eyebrow}>Regjistrim i shpejtë</span>
          <h1 className={styles.title} id="sign-up-title">Krijo llogari</h1>
          <p className={styles.subtitle}>
            Vetëm username dhe password. Nuk kërkohet email, emër apo numër telefoni.
          </p>

          <form action={formAction} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">Username</label>
              <input
                className={styles.input}
                id="username"
                name="username"
                type="text"
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_-]{3,20}"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="p.sh. alketa03"
                required
              />
              <span className={styles.hint}>3–20 karaktere: shkronja, numra, _ ose -</span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Password</label>
              <input
                className={styles.input}
                id="password"
                name="password"
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Së paku 8 karaktere"
                required
              />
            </div>

            {state?.error && (
              <p className={styles.error} role="alert" aria-live="polite">{state.error}</p>
            )}

            <button className={styles.submit} type="submit" disabled={isPending}>
              {isPending ? "Duke krijuar llogarinë..." : "Krijo llogari"}
            </button>
          </form>

          <p className={styles.switchText}>
            E ke llogarinë? <Link href="/auth/sign-in">Kyçu</Link>
          </p>

          <div className={styles.divider}>ose</div>
          <Link className={styles.guest} href="/">Vazhdo pa llogari</Link>
          <p className={styles.privacy}>Password-i nuk ruhet në kod dhe nuk shfaqet në website.</p>
        </section>
      </div>
    </main>
  );
}
