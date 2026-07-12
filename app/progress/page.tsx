import Link from "next/link";
import { auth } from "@/lib/auth/server";
import ProgressDashboard from "./ProgressDashboard";
import styles from "./progress.module.css";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const { data: session } = await auth.getSession();
  const username = session?.user?.name || null;

  if (!session?.user || !username) {
    return (
      <main className={styles.page}>
        <section className={styles.loginCard}>
          <span className={styles.eyebrow}>Progres privat</span>
          <h1>Kyçu për ta parë progresin tënd</h1>
          <p>Progresi i çdo nxënësi është i ndarë. Pa llogari, të dhënat ruhen vetëm në pajisjen ku po mëson.</p>
          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/auth/sign-in">Kyçu</Link>
            <Link className={styles.secondaryButton} href="/auth/sign-up">Krijo llogari</Link>
          </div>
        </section>
      </main>
    );
  }

  return <ProgressDashboard username={username} />;
}
