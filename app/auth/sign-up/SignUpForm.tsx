"use client";

import { Alert, Button, Divider, Input, Progress, type InputRef } from "antd";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { authPageHref } from "@/lib/auth/redirect";
import { normalizeUsername } from "@/lib/auth/username";
import GoogleAuthButton from "../GoogleAuthButton";
import StethoscopeLogo from "../../StethoscopeLogo";
import styles from "../auth.module.css";
import { signUpWithUsername } from "./actions";

type SignUpFormProps = { returnTo: string };

function passwordStrength(length: number): { value: number; label: string; level: "empty" | "short" | "good" | "strong" } {
  if (!length) return { value: 0, label: "Shkruaj password-in", level: "empty" };
  if (length < 8) return { value: 28, label: `${8 - length} karaktere edhe`, level: "short" };
  if (length < 12) return { value: 58, label: "I vlefshëm", level: "good" };
  return { value: Math.min(100, 72 + (length - 12) * 4), label: "I fortë", level: "strong" };
}

export default function SignUpForm({ returnTo }: SignUpFormProps) {
  const [state, formAction, isPending] = useActionState(signUpWithUsername, null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const usernameRef = useRef<InputRef>(null);
  const emailRef = useRef<InputRef>(null);
  const passwordRef = useRef<InputRef>(null);
  const confirmPasswordRef = useRef<InputRef>(null);
  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const strength = useMemo(() => passwordStrength(password.length), [password.length]);
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;
  const isRedirecting = Boolean(state?.success && state.returnTo);
  const busy = isPending || isRedirecting;

  useEffect(() => {
    if (state?.success && state.returnTo) {
      window.location.replace(state.returnTo);
      return;
    }
    if (!state?.error) return;
    if (state.username) setUsername(state.username);
    if (typeof state.email === "string") setEmail(state.email);
    if (state.field === "email") emailRef.current?.focus();
    else if (state.field === "password") passwordRef.current?.focus();
    else if (state.field === "confirmPassword") confirmPasswordRef.current?.focus();
    else usernameRef.current?.focus();
  }, [state]);

  useEffect(() => {
    const field = confirmPasswordRef.current?.input;
    if (!field) return;
    field.setCustomValidity(confirmPassword && password !== confirmPassword ? "Password-at nuk përputhen." : "");
  }, [confirmPassword, password]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href={returnTo}><span aria-hidden="true">←</span> Kthehu në portal</Link>
        <section className={styles.card} aria-labelledby="sign-up-title">
          <div className={styles.brand} aria-hidden="true"><StethoscopeLogo /></div>
          <span className={styles.eyebrow}>Llogaria jote personale</span>
          <h1 className={styles.title} id="sign-up-title">Regjistrohu</h1>
          <p className={styles.subtitle}>Zgjidh Google për mënyrën më të shpejtë, ose krijo llogari me username dhe password.</p>

          <GoogleAuthButton returnTo={returnTo} mode="sign-up" disabled={busy} />
          <Divider className={styles.divider} plain>ose me username</Divider>

          <form action={formAction} className={styles.form} aria-busy={busy}>
            <input type="hidden" name="returnTo" value={returnTo} />

            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">Username</label>
              <Input ref={usernameRef} className={`${styles.input} ${state?.field === "username" ? styles.inputError : ""}`} status={state?.field === "username" ? "error" : undefined} id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value.slice(0, 80))} minLength={2} maxLength={80} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="p.sh. alketa03" aria-invalid={state?.field === "username" || undefined} aria-describedby="sign-up-username-hint username-preview" disabled={busy} required size="large" />
              <span className={styles.hint} id="sign-up-username-hint">Lejohen shkronja, numra, pikë, _ dhe -. Hapësirat dhe ë/ç rregullohen automatikisht.</span>
              <span className={styles.usernamePreview} id="username-preview" aria-live="polite">{normalizedUsername ? <>Username-i yt: <b>@{normalizedUsername}</b></> : "Shembull: @alketa03"}</span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email <span className={styles.hint}>(opsional)</span></label>
              <Input ref={emailRef} className={`${styles.input} ${state?.field === "email" ? styles.inputError : ""}`} status={state?.field === "email" ? "error" : undefined} id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value.slice(0, 254))} maxLength={254} autoComplete="email" autoCapitalize="none" autoCorrect="off" placeholder="Për rikthimin e password-it" aria-invalid={state?.field === "email" || undefined} disabled={busy} size="large" />
              <span className={styles.hint}>Nuk është i detyrueshëm. Shtoje vetëm nëse dëshiron ta rikthesh password-in me email.</span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Krijo password-in</label>
              <div className={styles.passwordField}>
                <Input ref={passwordRef} className={`${styles.input} ${state?.field === "password" ? styles.inputError : ""}`} status={state?.field === "password" ? "error" : undefined} id="password" name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value.slice(0, 128))} minLength={8} maxLength={128} autoComplete="new-password" placeholder="Së paku 8 karaktere" aria-invalid={state?.field === "password" || undefined} aria-describedby="password-strength" disabled={busy} required size="large" />
                <Button className={styles.passwordToggle} type="text" size="small" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Fshehi password-at" : "Shfaqi password-at"} aria-pressed={showPassword} disabled={busy}>{showPassword ? "Fshehi" : "Shfaqi"}</Button>
              </div>
              <div className={styles.passwordStrength} id="password-strength" data-level={strength.level} aria-live="polite"><Progress percent={strength.value} showInfo={false} size="small" status={strength.level === "short" ? "exception" : strength.level === "strong" ? "success" : "normal"} /><span>{strength.label}</span></div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmPassword">Përsërite password-in</label>
              <Input ref={confirmPasswordRef} className={`${styles.input} ${state?.field === "confirmPassword" ? styles.inputError : ""}`} status={state?.field === "confirmPassword" || (confirmPassword && !passwordsMatch) ? "error" : undefined} id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value.slice(0, 128))} minLength={8} maxLength={128} autoComplete="new-password" placeholder="Shkruaje edhe një herë" aria-invalid={state?.field === "confirmPassword" || (confirmPassword && !passwordsMatch) || undefined} aria-describedby="password-match" disabled={busy} required size="large" />
              <span className={!confirmPassword ? styles.hint : passwordsMatch ? styles.usernamePreview : styles.capsLock} id="password-match" aria-live="polite">{!confirmPassword ? "Përsërite për të shmangur gabimet." : passwordsMatch ? "Password-at përputhen." : "Password-at nuk përputhen ende."}</span>
            </div>

            {state?.error && <Alert className={styles.error} type="error" message={state.error} showIcon role="alert" />}
            <Button className={styles.submit} htmlType="submit" type="primary" size="large" block loading={isPending || isRedirecting} disabled={busy}>{isRedirecting ? "Duke hapur portalin…" : isPending ? "Duke krijuar llogarinë…" : "Krijo llogarinë"}</Button>
          </form>

          <p className={styles.switchText}>E ke llogarinë? <Link href={authPageHref("/auth/sign-in", returnTo)}>Kyçu</Link></p>
          <Divider className={styles.divider} plain>ose</Divider>
          <Link className={styles.guest} href={returnTo}>Vazhdo pa llogari</Link>
          <p className={styles.privacy}>Google dhe emaili janë opsionale; username-i dhe password-i mjaftojnë për një llogari nxënësi.</p>
        </section>
      </div>
    </main>
  );
}
