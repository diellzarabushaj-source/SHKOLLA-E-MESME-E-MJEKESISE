"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { normalizeUsername } from "@/lib/auth/username";
import StethoscopeLogo from "../../StethoscopeLogo";
import styles from "../auth.module.css";
import { signUpWithUsername } from "./actions";

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpWithUsername, null);
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const normalized = normalizeUsername(username);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/">
          <span aria-hidden="true">←</span> Kthehu në portal
        </Link>

        <section className={styles.card} aria-labelledby="sign-up-title">
          <div className={styles.brand} aria-hidden="true"><StethoscopeLogo /></div>
          <span className={styles.eyebrow}>Vetëm dy hapa</span>
          <h1 className={styles.title} id="sign-up-title">Krijo llogari</h1>
          <p className={styles.subtitle}>Shkruaj një username dhe një password. Nuk kërkohet email ose numër telefoni.</p>

          <form action={formAction} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">Username</label>
              <input
                className={styles.input}
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                maxLength={40}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="p.sh. Alketa Rabushaj"
                required
              />
              <span className={styles.hint}>
                Hapësirat dhe shkronjat ë/ç rregullohen automatikisht.
              </span>
              {normalized && <span className={styles.usernamePreview}>Username-i yt: <b>@{normalized}</b></span>}
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
                  autoComplete="new-password"
                  placeholder="Së paku 8 karaktere"
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
              {isPending ? "Duke krijuar llogarinë..." : "Krijo llogarinë"}
            </button>
          </form>

          <p className={styles.switchText}>E ke llogarinë? <Link href="/auth/sign-in">Kyçu</Link></p>
          <div className={styles.divider}>ose</div>
          <Link className={styles.guest} href="/">Vazhdo pa llogari</Link>
          <p className={styles.privacy}>Progresi i llogarisë është privat dhe shihet vetëm nga përdoruesi i kyçur.</p>
        </section>
      </div>
    </main>
  );
}
