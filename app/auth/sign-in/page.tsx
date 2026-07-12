"use client";

import Link from "next/link";
import { useActionState } from "react";
import StethoscopeLogo from "../../StethoscopeLogo";
import styles from "../auth.module.css";
import { signInWithUsername } from "./actions";

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signInWithUsername, null);

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
          <p className={styles.subtitle}>Shkruaje username-in dhe password-in tënd.</p>

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
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Username"
                required
              />
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
                autoComplete="current-password"
                placeholder="Password"
                required
              />
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
