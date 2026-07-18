"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { authPageHref } from "@/lib/auth/redirect";
import { normalizeUsername } from "@/lib/auth/username";
import StethoscopeLogo from "../../StethoscopeLogo";
import styles from "../auth.module.css";
import { signUpWithUsername } from "./actions";

type SignUpFormProps = {
  returnTo: string;
};

function passwordStrength(length: number): { value: number; label: string; level: "empty" | "short" | "good" | "strong" } {
  if (!length) return { value: 0, label: "Shkruaj password-in", level: "empty" };
  if (length < 8) return { value: 28, label: `${8 - length} karaktere edhe`, level: "short" };
  if (length < 12) return { value: 58, label: "I vlefshëm", level: "good" };
  return { value: Math.min(100, 72 + (length - 12) * 4), label: "I fortë", level: "strong" };
}

export default function SignUpForm({ returnTo }: SignUpFormProps) {
  const [state, formAction, isPending] = useActionState(signUpWithUsername, null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const strength = useMemo(() => passwordStrength(password.length), [password.length]);

  useEffect(() => {
    if (!state?.error) return;
    if (state.username) setUsername(state.username);
    if (state.field === "password") passwordRef.current?.focus();
    else usernameRef.current?.focus();
  }, [state]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href={returnTo}>
          <span aria-hidden="true">←</span> Kthehu në portal
        </Link>

        <section className={styles.card} aria-labelledby="sign-up-title">
          <div className={styles.brand} aria-hidden="true"><StethoscopeLogo /></div>
          <span className={styles.eyebrow}>Llogaria jote personale</span>
          <h1 className={styles.title} id="sign-up-title">Krijo llogari</h1>
          <p className={styles.subtitle}>Duhet vetëm një username dhe një password. Nuk kërkohet email apo numër telefoni.</p>

          <form action={formAction} className={styles.form} aria-busy={isPending}>
            <input type="hidden" name="returnTo" value={returnTo} />

            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">Zgjidh username-in</label>
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
                aria-describedby="sign-up-username-hint username-preview"
                disabled={isPending}
                required
              />
              <span className={styles.hint} id="sign-up-username-hint">
                Lejohen shkronja, numra, pikë, _ dhe -. Hapësirat dhe ë/ç rregullohen automatikisht.
              </span>
              <span className={styles.usernamePreview} id="username-preview" aria-live="polite">
                {normalizedUsername ? <>Username-i yt do të jetë <b>@{normalizedUsername}</b></> : "Shembull: @alketa03"}
              </span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Krijo password-in</label>
              <div className={styles.passwordField}>
                <input
                  ref={passwordRef}
                  className={`${styles.input} ${state?.field === "password" ? styles.inputError : ""}`}
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value.slice(0, 128))}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  enterKeyHint="done"
                  placeholder="Së paku 8 karaktere"
                  onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
                  onBlur={() => setCapsLock(false)}
                  aria-invalid={state?.field === "password" || undefined}
                  aria-describedby="password-strength sign-up-password-hint"
                  disabled={isPending}
                  required
                />
                <button
                  className={styles.passwordToggle}
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Fshehe password-in" : "Shfaq password-in"}
                  aria-pressed={showPassword}
                  disabled={isPending}
                >
                  {showPassword ? "Fshehe" : "Shfaqe"}
                </button>
              </div>

              <div className={styles.passwordStrength} id="password-strength" data-level={strength.level} aria-live="polite">
                <span className={styles.strengthTrack} aria-hidden="true">
                  <span className={styles.strengthBar} style={{ width: `${strength.value}%` }} />
                </span>
                <span>{strength.label}</span>
              </div>
              <span className={styles.hint} id="sign-up-password-hint">Nuk kërkohen simbole, numra ose shkronja të mëdha.</span>
              {capsLock && <span className={styles.capsLock}>Caps Lock është aktiv.</span>}
            </div>

            {state?.error && <p className={styles.error} role="alert" aria-live="assertive">{state.error}</p>}

            <button className={styles.submit} type="submit" disabled={isPending}>
              {isPending && <span className={styles.spinner} aria-hidden="true" />}
              <span>{isPending ? "Duke krijuar llogarinë..." : "Krijo llogarinë"}</span>
            </button>
          </form>

          <div className={styles.securityNote}>
            <strong>Mbaje mend password-in.</strong>
            <span>Llogaria krijohet menjëherë dhe progresi lidhet vetëm me këtë username.</span>
          </div>

          <p className={styles.switchText}>
            E ke llogarinë? <Link href={authPageHref("/auth/sign-in", returnTo)}>Kyçu</Link>
          </p>
          <div className={styles.divider}>ose</div>
          <Link className={styles.guest} href={returnTo}>Vazhdo pa llogari</Link>
          <p className={styles.privacy}>Progresi, shënimet dhe sesioni yt janë privatë për llogarinë tënde.</p>
        </section>
      </div>
    </main>
  );
}
