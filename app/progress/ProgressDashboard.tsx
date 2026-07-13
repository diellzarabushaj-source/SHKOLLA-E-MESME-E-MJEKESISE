"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchProgressDashboard,
  type ActivitySessionRow,
  type CardProgressRow,
  type LessonProgressRow,
  type ReviewEventRow,
  type StudySessionRow,
} from "@/lib/progress/client";
import styles from "./progress.module.css";
import performanceStyles from "./performance.module.css";

type DashboardData = {
  progress: CardProgressRow[];
  sessions: StudySessionRow[];
  reviews: ReviewEventRow[];
  lessons: LessonProgressRow[];
  activity: ActivitySessionRow[];
};

type DailyActivity = {
  key: string;
  label: string;
  fullLabel: string;
  count: number;
  successful: number;
  height: number;
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

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes} min`;
  return seconds > 0 ? "< 1 min" : "0 min";
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

function dateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function weeklyPerformance(data: DashboardData | null) {
  const today = startOfDay(new Date());
  const start = addDays(today, -6);
  const end = addDays(today, 1);
  const days: DailyActivity[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return {
      key: dateKey(date),
      label: new Intl.DateTimeFormat("sq-AL", { weekday: "short" }).format(date).replace(".", ""),
      fullLabel: new Intl.DateTimeFormat("sq-AL", { weekday: "long", day: "2-digit", month: "short" }).format(date),
      count: 0,
      successful: 0,
      height: 4,
    };
  });

  if (!data) return { days, reviewed: 0, accuracy: 0, sessions: 0 };
  const byDate = new Map(days.map((day) => [day.key, day]));
  for (const review of data.reviews) {
    const reviewedAt = new Date(review.reviewed_at);
    if (reviewedAt < start || reviewedAt >= end) continue;
    const day = byDate.get(dateKey(reviewedAt));
    if (!day) continue;
    day.count += 1;
    if (review.rating === "good" || review.rating === "easy") day.successful += 1;
  }

  const reviewed = days.reduce((sum, day) => sum + day.count, 0);
  const successful = days.reduce((sum, day) => sum + day.successful, 0);
  const max = Math.max(1, ...days.map((day) => day.count));
  for (const day of days) day.height = day.count ? Math.max(18, Math.round((day.count / max) * 100)) : 4;

  return {
    days,
    reviewed,
    accuracy: reviewed ? Math.round((successful / reviewed) * 100) : 0,
    sessions: data.sessions.filter((session) => session.completed_at && new Date(session.completed_at) >= start).length,
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
      setError("Progresi nuk mund të ngarkohej. Provo përsëri.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadDashboard(); }, []);

  const performance = useMemo(() => weeklyPerformance(data), [data]);

  if (loading) {
    return <main className={styles.page}><div className={styles.loadingCard}><span className={styles.loader} />Duke ngarkuar progresin privat...</div></main>;
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
  const learned = data.progress.filter((row) => row.last_rating === "good" || row.last_rating === "easy").length;
  const mastered = data.progress.filter((row) => row.status === "mastered").length;
  const due = data.progress.filter((row) => new Date(row.due_at).getTime() <= Date.now()).length;
  const lessonsRead = data.lessons.filter((lesson) => Boolean(lesson.completed_at)).length;
  const lessonsOpened = data.lessons.length;
  const activeSeconds = data.activity.reduce((sum, item) => sum + Number(item.active_seconds || 0), 0);
  const lessonSeconds = data.lessons.reduce((sum, item) => sum + Number(item.active_seconds || 0), 0);
  const recentSessions = data.sessions.slice(0, 8);
  const recentReviews = data.reviews.slice(0, 8);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Progres privat</span>
          <h1>Progresi i @{username}</h1>
          <p>Koha llogaritet vetëm kur faqja është e dukshme dhe nxënësi është aktiv. Çdo rezultat izolohet sipas llogarisë.</p>
          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/">Vazhdo mësimin</Link>
            <button className={styles.secondaryButton} onClick={() => void loadDashboard()}>Rifresko</button>
          </div>
        </div>
        <div className={styles.privacyBox}><span aria-hidden="true">🔒</span><div><strong>I izoluar sipas llogarisë</strong><small>Sesioni përcakton user-in</small></div></div>
      </section>

      <section className={performanceStyles.performanceCard} aria-labelledby="performance-title">
        <span className={performanceStyles.glow} aria-hidden="true" />
        <span className={performanceStyles.surface} aria-hidden="true" />
        <div className={performanceStyles.content}>
          <header className={performanceStyles.header}>
            <div className={performanceStyles.titleGroup}><span className={performanceStyles.icon} aria-hidden="true">↗</span><div><span>Analiza javore</span><h2 id="performance-title">Performanca e mësimit</h2></div></div>
            <span className={performanceStyles.liveBadge}><i aria-hidden="true" /> Live</span>
          </header>
          <div className={performanceStyles.metricGrid}>
            <article className={performanceStyles.metricCard}><span>Kartela këtë javë</span><strong>{performance.reviewed}</strong><small>{performance.sessions} sesione</small></article>
            <article className={performanceStyles.metricCard}><span>Saktësi Mirë / Lehtë</span><strong>{performance.accuracy}%</strong><small>Të dhëna reale</small></article>
          </div>
          <div className={performanceStyles.chart} aria-label="Vlerësimet për shtatë ditët e fundit">
            {performance.days.map((day) => (
              <div className={performanceStyles.chartColumn} key={day.key}>
                <span className={performanceStyles.barValue}>{day.count}</span>
                <div className={performanceStyles.barTrack} role="img" aria-label={`${day.fullLabel}: ${day.count} kartela`}><span className={performanceStyles.barFill} style={{ height: `${day.height}%` }} /></div>
                <span className={performanceStyles.dayLabel}>{day.label}</span>
              </div>
            ))}
          </div>
          <footer className={performanceStyles.footer}><div className={performanceStyles.period}><span>7 ditët e fundit</span><small>{performance.sessions} sesione të përfunduara</small></div><a className={performanceStyles.detailsButton} href="#performance-details">Shiko detajet →</a></footer>
        </div>
      </section>

      <section className={styles.statGrid} id="performance-details" aria-label="Përmbledhja e progresit">
        <article><span>Koha aktive në aplikacion</span><strong>{formatDuration(activeSeconds)}</strong></article>
        <article><span>Koha aktive në mësime</span><strong>{formatDuration(lessonSeconds)}</strong></article>
        <article><span>Mësime të lexuara</span><strong>{lessonsRead}</strong><small>nga {lessonsOpened} të hapura</small></article>
        <article><span>Flashcards të ditura</span><strong>{learned}</strong><small>{mastered} të zotëruara</small></article>
        <article><span>Për përsëritje tani</span><strong>{due}</strong></article>
        <article><span>Vlerësime gjithsej</span><strong>{data.reviews.length}</strong></article>
      </section>

      {!totalReviewed && !data.sessions.length && !data.lessons.length ? (
        <section className={styles.emptyState}><span aria-hidden="true">📚</span><h2>Ende nuk ke progres të sinkronizuar</h2><p>Hape një mësim ose fillo flashcards. Progresi regjistrohet automatikisht.</p><Link className={styles.primaryButton} href="/">Fillo mësimin</Link></section>
      ) : (
        <section className={styles.twoColumns}>
          <div className={styles.section}>
            <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Historiku</span><h2>Sesionet e fundit</h2></div><span>{completedSessions.length} të përfunduara</span></div>
            <div className={styles.list}>{recentSessions.map((session) => <article key={session.id}><div><strong>{session.lesson_id}</strong><span>{formatDate(session.started_at)}</span></div><div className={styles.pills}><i className={styles.again}>{session.again_count} përsëri</i><i className={styles.good}>{session.good_count} mirë</i><i className={styles.easy}>{session.easy_count} lehtë</i></div></article>)}</div>
          </div>
          <div className={styles.section}>
            <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Aktiviteti</span><h2>Vlerësimet e fundit</h2></div></div>
            <div className={styles.list}>{recentReviews.map((review) => <article key={review.id}><div><strong>{review.lesson_id}</strong><span>{formatDate(review.reviewed_at)}</span></div><i className={styles[review.rating]}>{ratingLabels[review.rating]}</i></article>)}</div>
          </div>
        </section>
      )}
    </main>
  );
}
