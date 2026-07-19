"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { signOutAction } from "./auth/actions";
import styles from "./AuthControls.module.css";

export default function AuthControls({ username: initialUsername }: { username: string | null }) {
  const { data: session, isPending } = authClient.useSession();
  const liveUsername = session?.user?.name || null;
  const username = isPending ? initialUsername : liveUsername;

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
      <form action={signOutAction} className={styles.logoutForm}>
        <button className={styles.logout} type="submit" aria-label="Dil nga llogaria">Dil</button>
      </form>
    </div>
  );
}
