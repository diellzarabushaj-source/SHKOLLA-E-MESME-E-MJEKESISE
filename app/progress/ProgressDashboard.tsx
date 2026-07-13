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
import performanceStyles from "./performance.module.css";

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

type DailyActivity = {
  key: string;
  label: string;
  fullLabel: string;
  count: number;
  successful: number;
  height: number;
};

type PerformanceSummary = {
  days: DailyActivity[];
  weeklyReviewed: number;
  weeklyAccuracy: number;
  weeklySessions: number;
  reviewTrend: number | null;
  accuracyDelta: number | null;
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

function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, amount: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function localDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createPerformanceSummary(data: DashboardData | null): PerformanceSummary {
  const today = startOfDay(new Date());
  const currentStart = addDays(today, -6);
  const currentEnd = addDays(today, 1);
  const previousStart = addDays(today, -13);
  const previousEnd = currentStart;

  const rawDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(currentStart, index);
    return {
      key: localDateKey(date),
      label: new Intl.DateTimeFormat("sq-AL", { weekday: "short" }).format(date).replace(".", ""),
      fullLabel: new Intl.DateTimeFormat("sq-AL", {
        weekday: "long",
        day: "2-digit",
        month: "short",
      }).format(date),
      count: 0,
      successful: 0,
    };
  });

  if (!data) {
    return {
      days: rawDays.map((day) => ({ ...day, height: 4 })),
      weeklyReviewed: 0,
      weeklyAccuracy: 0,
      weeklySessions: 0,
      reviewTrend: null,
      accuracyDelta: null,
    };
  }

  const dayMap = new Map(rawDays.map((day) => [day.key, day]));
  let previousReviewed = 0;
  let previousSuccessful = 0;

  for (const review of data.reviews) {
    const reviewedAt = new Date(review.reviewed_at);
    if (Number.isNaN(reviewedAt.getTime())) continue;

    if (reviewedAt >= currentStart && reviewedAt < currentEnd) {
      const day = dayMap.get(localDateKey(reviewedAt));
      if (day) {
        day.count += 1;
        if (review.rating === "good" || review.rating === "easy") day.successful += 1;
      }
    } else if (reviewedAt >= previousStart && reviewedAt < previousEnd) {
      previousReviewed += 1;
      if (review.rating === "good" || review.rating === "easy") previousSuccessful += 1;
    }
  }

  const weeklyReviewed = rawDays.reduce((sum, day) => sum + day.count, 0);
  const weeklySuccessful = rawDays.reduce((sum, day) => sum + day.successful, 0);
  const weeklyAccuracy = weeklyReviewed ? Math.round((weeklySuccessful / weeklyReviewed) * 100) : 0;
  const previousAccuracy = previousReviewed ? Math.round((previousSuccessful / previousReviewed) * 100) : null;
  const maxCount = Math.max(1, ...rawDays.map((day) => day.count));

  const weeklySessions = data.sessions.filter((session) => {
    if (!session.completed_at) return false;
    const completedAt = new Date(session.completed_at);
    return completedAt >= currentStart && completedAt < currentEnd;
  }).length;

  return {
    days: rawDays.map((day) => ({
      ...day,
      height: day.count ? Math.max(18, Math.round((day.count / maxCount) * 100)) : 4,
    })),
    weeklyReviewed,
    weeklyAccuracy,
    weeklySessions,
    reviewTrend: previousReviewed
      ? Math.round(((weeklyReviewed - previousReviewed) / previousReviewed) * 100)
      : null,
    accuracyDelta: previousAccuracy === null ? null : weeklyAccuracy - previousAccuracy,
  };
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

  const performance = useMemo(() => createPerformanceSummary(data), [data]);

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

  const reviewTrendText = performance.reviewTrend === null
    ? performance.weeklyReviewed > 0 ? "Javë aktive" : "Pa aktivitet"
    : `${performance.reviewTrend >= 0 ? "+" : ""}${performance.reviewTrend}%`;

  const accuracyTrendText = performance.accuracyDelta === null
    ? performance.weeklyReviewed > 0 ? "Bazë e re" : "Pa vlerësime"
    : `${performance.accuracyDelta >= 0 ? "+" : ""}${performance.accuracyDelta} pikë`;

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

      <section className={performanceStyles.performanceCard} aria-labelledby="performance-title">
        <span className={performanceStyles.glow} aria-hidden="true" />
        <span className={performanceStyles.surface} aria-hidden="true" />

        <div className={performanceStyles.content}>
          <header className={performanceStyles.header}>
            <div className={performanceStyles.titleGroup}>
              <span className={performanceStyles.icon} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M4 17 9 12l3 3 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <span>Analiza javore</span>
                <h2 id="performance-title">Performanca e mësimit</h2>
              </div>
            </div>

            <span className={performanceStyles.liveBadge}>
              <i aria-hidden="true" /> Live
            </span>
          </header>

          <div className={performanceStyles.metricGrid}>
            <article className={performanceStyles.metricCard}>
              <span>Kartela këtë javë</span>
              <strong>{performance.weeklyReviewed}</strong>
              <small className={performance.reviewTrend !== null && performance.reviewTrend < 0 ? performanceStyles.negative : ""}>
                {reviewTrendText}
              </small>
            </article>

            <article className={performanceStyles.metricCard}>
              <span>Saktësi Mirë / Lehtë</span>
              <strong>{performance.weeklyAccuracy}%</strong>
              <small className={performance.accuracyDelta !== null && performance.accuracyDelta < 0 ? performanceStyles.negative : ""}>
                {accuracyTrendText}
              </small>
            </article>
          </div>

          <div className={performanceStyles.chart} aria-label="Vlerësimet për secilën nga shtatë ditët e fundit">
            {performance.days.map((day) => (
              <div className={performanceStyles.chartColumn} key={day.key}>
                <span className={performanceStyles.barValue}>{day.count}</span>
                <div
                  className={performanceStyles.barTrack}
                  role="img"
                  aria-label={`${day.fullLabel}: ${day.count} kartela të vlerësuara`}
                  title={`${day.fullLabel}: ${day.count} kartela`}
                >
                  <span className={performanceStyles.barFill} style={{ height: `${day.height}%` }} />
                </div>
                <span className={performanceStyles.dayLabel}>{day.label}</span>
              </div>
            ))}
          </div>

          <footer className={performanceStyles.footer}>
            <div className={performanceStyles.period}>
              <span>7 ditët e fundit</span>
              <small>{performance.weeklySessions} sesione të përfunduara</small>
            </div>

            <a className={performanceStyles.detailsButton} href="#performance-details">
              Shiko detajet
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </footer>
        </div>
      </section>

      <section className={styles.statGrid} id="performance-details" aria-label="Përmbledhja e progresit">
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
