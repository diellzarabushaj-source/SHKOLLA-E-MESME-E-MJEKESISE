"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchProgressDashboard,
  type CardProgressRow,
  type ReviewEventRow,
  type StudySessionRow,
} from "@/lib/progress/client";
import styles from "./progress.module.css";

type DashboardData = {
  progress: CardProgressRow[];
  sessions: StudySessionRow[];
  reviews: ReviewEventRow[];
};

type LessonSummary = {
  lessonId: string;
  reviewed: number;
  learned: number;
  mastered: number;
  due: number;
  lastStudiedAt: string | null;
};

const ratingLabels = {
  again: "Përsëri",
  hard: "Vështirë",
  good: "Mirë",
  easy: "Lehtë",
} as const;

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("sq-AL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ProgressDashboard({ username }: { username: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      setData(await fetchProgressDashboard());
    } catch (loadError) {
      console.error(loadError);
      setError("Progresi nuk mund të ngarkohej. Rifresko faqen dhe provo përsëri.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const lessonSummaries = useMemo<LessonSummary[]>(() => {
    if (!data) return [];
    const now = Date.now();
    const map = new Map<string, LessonSummary>();

    for (const row of data.progress) {
      const current = map.get(row.lesson_id) || {
        lessonId: row.lesson_id,
        reviewed: 0,
        learned: 0,
        mastered: 0,
        due: 0,
        lastStudiedAt: null,
      };
      current.reviewed += 1;
      if (row.last_rating === "good" || row.last_rating === "easy") current.learned += 1;
      if (row.status === "mastered") current.mastered += 1;
      if (new Date(row.due_at).getTime() <= now) current.due += 1;
      if (!current.lastStudiedAt || row.updated_at > current.lastStudiedAt) current.lastStudiedAt = row.updated_at;
      map.set(row.lesson_id, current);
    }

    return Array.from(map.values()).sort((a, b) =>
      (b.lastStudiedAt || "").localeCompare(a.lastStudiedAt || ""),
    );
  }, [data]);

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}><span className={styles.loader} />Duke ngarkuar progresin privat...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className={styles.page}>
        <section className={styles.loginCard}>
          <span className={styles.eyebrow}>Gabim</span>
          <h1>Progresi nuk u ngarkua</h1>
          <p>{error}</p>
          <button className={styles.primaryButton} onClick={() => void loadDashboard()}>Provo përsëri</button>
        </section>
      </main>
    );
  }

  const completedSessions = data.sessions.filter((session) => session.completed_at);
  const totalReviewed = data.progress.length;
  const mastered = data.progress.filter((row) => row.status === "mastered").length;
  const learned = data.progress.filter((row) => row.last_rating === "good" || row.last_rating === "easy").length;
  const due = data.progress.filter((row) => new Date(row.due_at).getTime() <= Date.now()).length;
  const recentSessions = data.sessions.slice(0, 8);
  const recentReviews = data.reviews.slice(0, 8);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Progres privat</span>
          <h1>Progresi i @{username}</h1>
          <p>Vetëm kjo llogari mund t’i lexojë këto rezultate. Progresi i nxënësve të tjerë nuk kthehet nga databaza.</p>
          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/">Vazhdo mësimin</Link>
            <button className={styles.secondaryButton} onClick={() => void loadDashboard()}>Rifresko</button>
          </div>
        </div>
        <div className={styles.privacyBox}>
          <span aria-hidden="true">🔒</span>
          <div><strong>I izoluar sipas llogarisë</strong><small>RLS aktiv në databazë</small></div>
        </div>
      </section>

      <section className={styles.statGrid} aria-label="Përmbledhja e progresit">
        <article><span>Flashcards të vlerësuara</span><strong>{totalReviewed}</strong></article>
        <article><span>Të mësuara</span><strong>{learned}</strong></article>
        <article><span>Të zotëruara</span><strong>{mastered}</strong></article>
        <article><span>Për përsëritje tani</span><strong>{due}</strong></article>
        <article><span>Sesione të përfunduara</span><strong>{completedSessions.length}</strong></article>
        <article><span>Vlerësime gjithsej</span><strong>{data.reviews.length}</strong></article>
      </section>

      {!data.progress.length && !data.sessions.length ? (
        <section className={styles.emptyState}>
          <span aria-hidden="true">📚</span>
          <h2>Ende nuk ke progres të sinkronizuar</h2>
          <p>Hape një mësim, fillo flashcards dhe vlerëso kartelat. Rezultatet do të shfaqen këtu.</p>
          <Link className={styles.primaryButton} href="/">Fillo mësimin</Link>
        </section>
      ) : (
        <>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div><span className={styles.eyebrow}>Sipas mësimit</span><h2>Përparimi yt</h2></div>
              <span>{lessonSummaries.length} mësime</span>
            </div>
            <div className={styles.lessonGrid}>
              {lessonSummaries.map((lesson) => {
                const learnedPercent = lesson.reviewed ? Math.round((lesson.learned / lesson.reviewed) * 100) : 0;
                return (
                  <article className={styles.lessonCard} key={lesson.lessonId}>
                    <div className={styles.lessonTop}>
                      <h3>{lesson.lessonId}</h3>
                      <span>{learnedPercent}%</span>
                    </div>
                    <div className={styles.progressTrack}><span style={{ width: `${learnedPercent}%` }} /></div>
                    <div className={styles.lessonStats}>
                      <span><b>{lesson.reviewed}</b> kartela</span>
                      <span><b>{lesson.learned}</b> mësuar</span>
                      <span><b>{lesson.mastered}</b> zotëruar</span>
                      <span><b>{lesson.due}</b> për përsëritje</span>
                    </div>
                    <small>Hera e fundit: {formatDate(lesson.lastStudiedAt)}</small>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={styles.twoColumns}>
            <div className={styles.section}>
              <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Historiku</span><h2>Sesionet e fundit</h2></div></div>
              <div className={styles.list}>
                {recentSessions.map((session) => (
                  <article key={session.id}>
                    <div><strong>{session.lesson_id}</strong><span>{formatDate(session.started_at)}</span></div>
                    <div className={styles.pills}>
                      <i className={styles.again}>{session.again_count} përsëri</i>
                      <i className={styles.hard}>{session.hard_count} vështirë</i>
                      <i className={styles.good}>{session.good_count} mirë</i>
                      <i className={styles.easy}>{session.easy_count} lehtë</i>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Aktiviteti</span><h2>Vlerësimet e fundit</h2></div></div>
              <div className={styles.list}>
                {recentReviews.map((review) => (
                  <article key={review.id}>
                    <div><strong>{review.lesson_id}</strong><span>{formatDate(review.reviewed_at)}</span></div>
                    <i className={styles[review.rating]}>{ratingLabels[review.rating]}</i>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
