"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { signOutAction } from "./auth/actions";
import styles from "./AuthControls.module.css";

export default function AuthControls({ username: initialUsername }: { username: string | null }) {
  const { data: session, isPending } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const liveUsername = session?.user?.name || null;
  const username = signedOut ? null : isPending ? initialUsername : liveUsername;

  async function handleSignOut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSigningOut) return;

    setSignOutError("");
    setIsSigningOut(true);

    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message || "SIGN_OUT_FAILED");

      // Update the header immediately, then perform one clean navigation so
      // all server components, protected routes and session cookies agree.
      setSignedOut(true);
      window.dispatchEvent(new Event("medical-portal:auth-changed"));
      window.location.replace("/");
    } catch {
      setSignOutError("Dalja nuk u krye. Provo përsëri.");
      setIsSigningOut(false);
    }
  }

  if (!username) {
    return (
      <div className={styles.controls} aria-label="Llogaria">
        <Link className={styles.link} href="/auth/sign-in">Kyçu</Link>
        <Link className={`${styles.link} ${styles.primary} ${styles.register}`} href="/auth/sign-up">
          Regjistrohu
        </Link>
      </div>
    );
  }

  const label = username.startsWith("@") ? username : `@${username}`;

  return (
    <div className={`${styles.controls} ${styles.account}`} aria-label="Llogaria e kyçur">
      <span className={styles.user} title={username}>
        <span className={styles.dot} aria-hidden="true" />
        {label}
      </span>
      <form action={signOutAction} className={styles.logoutForm} onSubmit={handleSignOut}>
        <button
          className={styles.logout}
          type="submit"
          aria-label={isSigningOut ? "Duke dalë nga llogaria" : "Dil nga llogaria"}
          aria-busy={isSigningOut}
          disabled={isSigningOut}
          title={signOutError || undefined}
        >
          {isSigningOut ? "Po del…" : signOutError ? "Provo prapë" : "Dil"}
        </button>
        {signOutError && <span className={styles.logoutError} role="alert">{signOutError}</span>}
      </form>
    </div>
  );
}
