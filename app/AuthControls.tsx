"use client";

import { Button, Space, Tag } from "antd";
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
      if (result.error) throw new Error("SIGN_OUT_FAILED");

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
      <Space className={styles.controls} size={8} aria-label="Llogaria">
        <Button className={styles.link} type="text" href="/auth/sign-in">Kyçu</Button>
        <Button className={`${styles.link} ${styles.primary} ${styles.register}`} type="primary" href="/auth/sign-up">
          Regjistrohu
        </Button>
      </Space>
    );
  }

  const label = username.startsWith("@") ? username : `@${username}`;

  return (
    <Space className={`${styles.controls} ${styles.account}`} size={8} aria-label="Llogaria e kyçur">
      <Tag className={styles.user} color="processing" title={username}>
        <span className={styles.dot} aria-hidden="true" />
        {label}
      </Tag>
      <form action={signOutAction} className={styles.logoutForm} onSubmit={handleSignOut}>
        <Button
          className={styles.logout}
          htmlType="submit"
          type="text"
          loading={isSigningOut}
          aria-label={isSigningOut ? "Duke dalë nga llogaria" : "Dil nga llogaria"}
          aria-busy={isSigningOut}
          disabled={isSigningOut}
          title={signOutError || undefined}
        >
          {isSigningOut ? "Po del…" : signOutError ? "Provo prapë" : "Dil"}
        </Button>
        {signOutError && <span className={styles.logoutError} role="alert">{signOutError}</span>}
      </form>
    </Space>
  );
}
