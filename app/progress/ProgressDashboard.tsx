"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  fetchProgressDashboard,
  type ActivitySessionRow,
  type CardProgressRow,
  type LessonProgressRow,
  type ReviewEventRow,
  type StudySessionRow,
} from "@/lib/progress/client";
import MetabaseProgressAnalytics from "./MetabaseProgressAnalytics";
import styles from "./progress.module.css";

type DashboardData = {
  progress: CardProgressRow[];
  sessions: StudySessionRow[];
  reviews: ReviewEventRow[];
  lessons: LessonProgressRow[];
  activity: ActivitySessionRow[];
};

export type ProgressContentLabels = {
  grades: Record<string, string>;
  subjects: Record<string, string>;
  chapters: Record<string, string>;
  lessons: Record<string, string>;
};

type MetabaseConfig = {
  siteUrl: string | null;
  dashboardId: string | null;
};

type DailyPoint = {
  key: string;
  label: string;
  fullLabel: string;
  reviews: number;
  successful: number;
};

type SubjectSummary = {
  id: string;
  title: string;
  reviewedCards: number;
  mastered: number;
  due: number;
  sessions: number;
  accuracy: number;
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

function shortId(value: string): string {
  return value.length > 22 ? `${value.slice(0, 19)}…` : value;
}

function labelFor(
  labels: Record<string, string>,
  id: string,
): string {
  return labels[id] || shortId(id);
}

function buildDailySeries(reviews: ReviewEventRow[], days = 14): DailyPoint[] {
  const today = startOfDay(new Date());
  const firstDay = addDays(today, -(days - 1));
  const points: DailyPoint[] = Array.from({ length: days }, (_, index) => {
    const date = addDays(firstDay, index);
    return {
      key: dateKey(date),
      label: new Intl.DateTimeFormat("sq-AL", {
        weekday: "short",
      }).format(date).replace(".", ""),
      fullLabel: new Intl.DateTimeFormat("sq-AL", {
        day: "2-digit",
        month: "short",
      }).format(date),
      reviews: 0,
      successful: 0,
    };
  });

  const byDay = new Map(points.map((point) => [point.key, point]));
  for (const review of reviews) {
    const point = byDay.get(dateKey(new Date(review.reviewed_at)));
    if (!point) continue;
    point.reviews += 1;
    if (review.rating === "good" || review.rating === "easy") {
      point.successful += 1;
    }
  }
  return points;
}

function currentStreak(data: DashboardData): number {
  const activeDays = new Set<string>();
  data.reviews.forEach((row) => activeDays.add(dateKey(new Date(row.reviewed_at))));
  data.sessions.forEach((row) => activeDays.add(dateKey(new Date(row.started_at))));
  data.activity
    .filter((row) => Number(row.active_seconds || 0) > 0)
    .forEach((row) => activeDays.add(dateKey(new Date(row.started_at))));

  if (!activeDays.size) return 0;
  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);
  let cursor = activeDays.has(dateKey(today))
    ? today
    : activeDays.has(dateKey(yesterday))
      ? yesterday
      : null;

  if (!cursor) return 0;
  let streak = 0;
  while (activeDays.has(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function subjectSummaries(
  data: DashboardData,
  labels: ProgressContentLabels,
): SubjectSummary[] {
  const subjectIds = new Set<string>([
    ...data.progress.map((row) => row.subject_id),
    ...data.sessions.map((row) => row.subject_id),
  ]);

  return Array.from(subjectIds).map((subjectId) => {
    const cards = data.progress.filter((row) => row.subject_id === subjectId);
    const sessions = data.sessions.filter((row) => row.subject_id === subjectId);
    const reviews = data.reviews.filter((review) => {
      const card = data.progress.find((row) => row.flashcard_id === review.flashcard_id);
      return card?.subject_id === subjectId;
    });
    const successful = reviews.filter(
      (row) => row.rating === "good" || row.rating === "easy",
    ).length;

    return {
      id: subjectId,
      title: labelFor(labels.subjects, subjectId),
      reviewedCards: cards.length,
      mastered: cards.filter((row) => row.status === "mastered").length,
      due: cards.filter((row) => new Date(row.due_at).getTime() <= Date.now()).length,
      sessions: sessions.filter((row) => row.completed_at).length,
      accuracy: reviews.length ? Math.round((successful / reviews.length) * 100) : 0,
    };
  }).sort((a, b) => {
    if (b.reviewedCards !== a.reviewedCards) return b.reviewedCards - a.reviewedCards;
    return a.title.localeCompare(b.title, "sq");
  });
}

function trendLabel(current: number, previous: number): {
  text: string;
  positive: boolean;
} {
  if (!previous && !current) return { text: "Pa aktivitet", positive: true };
  if (!previous) return { text: "+100% vs java e kaluar", positive: true };
  const delta = Math.round(((current - previous) / previous) * 100);
  return {
    text: `${delta >= 0 ? "+" : ""}${delta}% vs java e kaluar`,
    positive: delta >= 0,
  };
}

export default function ProgressDashboard({
  username,
  labels,
  metabase,
}: {
  username: string;
  labels: ProgressContentLabels;
  metabase: MetabaseConfig;
}) {
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

  useEffect(() => {
    void loadDashboard();
  }, []);

  const daily = useMemo(
    () => buildDailySeries(data?.reviews || []),
    [data?.reviews],
  );
  const subjects = useMemo(
    () => data ? subjectSummaries(data, labels) : [],
    [data, labels],
  );

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>
          <span className={styles.loader} />
          Duke përgatitur dashboard-in tënd…
        </div>
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
          <button className={styles.primaryButton} onClick={() => void loadDashboard()}>
            Provo përsëri
          </button>
        </section>
      </main>
    );
  }

  const successfulReviews = data.reviews.filter(
    (row) => row.rating === "good" || row.rating === "easy",
  ).length;
  const accuracy = data.reviews.length
    ? Math.round((successfulReviews / data.reviews.length) * 100)
    : 0;
  const mastered = data.progress.filter((row) => row.status === "mastered").length;
  const masteryRate = data.progress.length
    ? Math.round((mastered / data.progress.length) * 100)
    : 0;
  const due = data.progress.filter(
    (row) => new Date(row.due_at).getTime() <= Date.now(),
  ).length;
  const activeSeconds = data.activity.reduce(
    (sum, row) => sum + Number(row.active_seconds || 0),
    0,
  );
  const lessonSeconds = data.lessons.reduce(
    (sum, row) => sum + Number(row.active_seconds || 0),
    0,
  );
  const lessonsCompleted = data.lessons.filter((row) => row.completed_at).length;
  const streak = currentStreak(data);
  const lastSevenReviews = daily.slice(-7).reduce((sum, point) => sum + point.reviews, 0);
  const previousSevenReviews = daily.slice(0, 7).reduce((sum, point) => sum + point.reviews, 0);
  const velocityTrend = trendLabel(lastSevenReviews, previousSevenReviews);
  const maxDailyReviews = Math.max(1, ...daily.map((point) => point.reviews));
  const ratingCounts = {
    again: data.reviews.filter((row) => row.rating === "again").length,
    hard: data.reviews.filter((row) => row.rating === "hard").length,
    good: data.reviews.filter((row) => row.rating === "good").length,
    easy: data.reviews.filter((row) => row.rating === "easy").length,
  };
  const recentSessions = data.sessions.slice(0, 6);
  const recentReviews = data.reviews.slice(0, 6);
  const totalCompletedSessions = data.sessions.filter((row) => row.completed_at).length;
  const heroProgress = Math.min(
    100,
    Math.round((accuracy * 0.45) + (masteryRate * 0.35) + (Math.min(streak, 7) / 7 * 20)),
  );

  const timestampCandidates = [
    data.reviews[0]?.reviewed_at,
    data.sessions[0]?.started_at,
    data.lessons[0]?.updated_at,
  ].filter((value): value is string => typeof value === "string");
  const latestActivity = timestampCandidates.sort().at(-1) || null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.heroTopline}>
              <span className={styles.eyebrow}>Dashboard i progresit</span>
              <span className={styles.liveBadge}><i /> Të dhëna reale</span>
            </div>
            <h1>Përshëndetje, {username}</h1>
            <p>
              Këtu e sheh ritmin e mësimit, kartelat që duhen përsëritur dhe
              temat ku po përparon më shpejt.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryButton} href="/">Vazhdo mësimin</Link>
              <button className={styles.secondaryButton} onClick={() => void loadDashboard()}>
                Rifresko të dhënat
              </button>
            </div>
          </div>

          <div className={styles.heroStatus}>
            <div
              className={styles.statusRing}
              style={{ "--progress": `${heroProgress * 3.6}deg` } as CSSProperties}
              aria-label={`Indeksi i progresit: ${heroProgress}%`}
            >
              <div>
                <strong>{heroProgress}%</strong>
                <span>ritëm</span>
              </div>
            </div>
            <div className={styles.statusLabel}>
              <span>Aktiviteti i fundit</span>
              <strong>{formatDate(latestActivity)}</strong>
            </div>
          </div>
        </section>

        <section className={styles.kpiGrid} aria-label="Treguesit kryesorë">
          <article className={styles.kpiCard}>
            <span>Saktësia</span>
            <strong>{accuracy}%</strong>
            <small>{successfulReviews} përgjigje Mirë / Lehtë</small>
          </article>
          <article className={styles.kpiCard}>
            <span>Streak aktual</span>
            <strong>{streak} <em>ditë</em></strong>
            <small>{streak >= 7 ? "Ritëm shumë i mirë" : "Syno 7 ditë rresht"}</small>
          </article>
          <article className={styles.kpiCard}>
            <span>Kartela këtë javë</span>
            <strong>{lastSevenReviews}</strong>
            <small className={velocityTrend.positive ? styles.positive : styles.negative}>
              {velocityTrend.text}
            </small>
          </article>
          <article className={`${styles.kpiCard} ${due > 0 ? styles.attentionCard : ""}`}>
            <span>Për përsëritje tani</span>
            <strong>{due}</strong>
            <small>{due ? "Prioriteti yt i radhës" : "Asgjë e vonuar"}</small>
          </article>
          <article className={styles.kpiCard}>
            <span>Mastery</span>
            <strong>{masteryRate}%</strong>
            <small>{mastered} nga {data.progress.length} kartela të ndjekura</small>
          </article>
          <article className={styles.kpiCard}>
            <span>Koha aktive</span>
            <strong>{formatDuration(activeSeconds)}</strong>
            <small>{formatDuration(lessonSeconds)} brenda mësimeve</small>
          </article>
        </section>

        {!data.progress.length && !data.sessions.length && !data.lessons.length ? (
          <section className={styles.emptyState}>
            <span className={styles.emptyMark}>↗</span>
            <h2>Dashboard-i është gati</h2>
            <p>
              Hape një mësim ose fillo një test me flashcards. Aktiviteti do të
              shfaqet automatikisht këtu.
            </p>
            <Link className={styles.primaryButton} href="/">Fillo mësimin</Link>
          </section>
        ) : (
          <>
            <section className={styles.analyticsGrid}>
              <article className={styles.chartCard}>
                <header className={styles.cardHeader}>
                  <div>
                    <span className={styles.eyebrow}>14 ditët e fundit</span>
                    <h2>Ritmi i përsëritjeve</h2>
                  </div>
                  <div className={styles.headerMetric}>
                    <strong>{lastSevenReviews}</strong>
                    <span>këtë javë</span>
                  </div>
                </header>

                <div className={styles.barChart} aria-label="Kartelat e vlerësuara për 14 ditë">
                  {daily.map((point) => {
                    const height = point.reviews
                      ? Math.max(12, Math.round((point.reviews / maxDailyReviews) * 100))
                      : 3;
                    return (
                      <div className={styles.barColumn} key={point.key}>
                        <span className={styles.barValue}>{point.reviews || ""}</span>
                        <div
                          className={styles.barTrack}
                          title={`${point.fullLabel}: ${point.reviews} kartela`}
                        >
                          <span
                            className={styles.barFill}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span className={styles.barLabel}>{point.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className={styles.chartLegend}>
                  <span><i className={styles.legendPrimary} /> Kartela të vlerësuara</span>
                  <span>{data.reviews.length} vlerësime gjithsej</span>
                </div>
              </article>

              <article className={styles.distributionCard}>
                <header className={styles.cardHeader}>
                  <div>
                    <span className={styles.eyebrow}>Cilësia e kujtesës</span>
                    <h2>Shpërndarja e përgjigjeve</h2>
                  </div>
                  <div className={styles.headerMetric}>
                    <strong>{accuracy}%</strong>
                    <span>saktësi</span>
                  </div>
                </header>

                <div className={styles.ratingList}>
                  {(Object.keys(ratingCounts) as Array<keyof typeof ratingCounts>).map((rating) => {
                    const count = ratingCounts[rating];
                    const percentage = data.reviews.length
                      ? Math.round((count / data.reviews.length) * 100)
                      : 0;
                    return (
                      <div className={styles.ratingRow} key={rating}>
                        <div className={styles.ratingMeta}>
                          <span className={styles[rating]}>{ratingLabels[rating]}</span>
                          <strong>{count} <small>{percentage}%</small></strong>
                        </div>
                        <div className={styles.ratingTrack}>
                          <span
                            className={`${styles.ratingFill} ${styles[`${rating}Fill`]}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            <section className={styles.insightStrip} aria-label="Përmbledhja e aktivitetit">
              <div><span>Mësime të përfunduara</span><strong>{lessonsCompleted}</strong></div>
              <div><span>Sesione të përfunduara</span><strong>{totalCompletedSessions}</strong></div>
              <div><span>Kartela të zotëruara</span><strong>{mastered}</strong></div>
              <div><span>Lëndë me aktivitet</span><strong>{subjects.length}</strong></div>
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>Pamje sipas lëndës</span>
                  <h2>Ku je më i fortë dhe ku duhet fokus</h2>
                </div>
                <span>{subjects.length} lëndë të ndjekura</span>
              </div>

              <div className={styles.subjectTable}>
                <div className={styles.subjectHeader} aria-hidden="true">
                  <span>Lënda</span>
                  <span>Kartela</span>
                  <span>Mastered</span>
                  <span>Saktësia</span>
                  <span>Për përsëritje</span>
                </div>
                {subjects.map((subject) => (
                  <div className={styles.subjectRow} key={subject.id}>
                    <div className={styles.subjectName}>
                      <i className={styles.subjectDot} />
                      <div>
                        <strong>{subject.title}</strong>
                        <small>{subject.sessions} sesione të përfunduara</small>
                      </div>
                    </div>
                    <span data-label="Kartela">{subject.reviewedCards}</span>
                    <span data-label="Mastered">{subject.mastered}</span>
                    <span data-label="Saktësia">{subject.accuracy}%</span>
                    <span
                      data-label="Për përsëritje"
                      className={subject.due ? styles.dueValue : undefined}
                    >
                      {subject.due}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.recentGrid}>
              <article className={styles.sectionCard}>
                <div className={styles.sectionHeading}>
                  <div>
                    <span className={styles.eyebrow}>Historiku</span>
                    <h2>Sesionet e fundit</h2>
                  </div>
                </div>
                <div className={styles.activityList}>
                  {recentSessions.map((session) => {
                    const known = session.good_count + session.easy_count;
                    const scored = session.again_count + session.hard_count + known;
                    const score = scored ? Math.round((known / scored) * 100) : 0;
                    return (
                      <div className={styles.activityRow} key={session.id}>
                        <span className={styles.activityIcon}>S</span>
                        <div className={styles.activityMain}>
                          <strong>{labelFor(labels.lessons, session.lesson_id)}</strong>
                          <span>{formatDate(session.started_at)}</span>
                        </div>
                        <div className={styles.sessionScore}>
                          <strong>{score}%</strong>
                          <span>{session.total_cards} kartela</span>
                        </div>
                      </div>
                    );
                  })}
                  {!recentSessions.length && <p className={styles.muted}>Ende nuk ka sesione.</p>}
                </div>
              </article>

              <article className={styles.sectionCard}>
                <div className={styles.sectionHeading}>
                  <div>
                    <span className={styles.eyebrow}>Aktiviteti</span>
                    <h2>Vlerësimet e fundit</h2>
                  </div>
                </div>
                <div className={styles.activityList}>
                  {recentReviews.map((review) => (
                    <div className={styles.activityRow} key={review.id}>
                      <span className={styles.activityIcon}>F</span>
                      <div className={styles.activityMain}>
                        <strong>{labelFor(labels.lessons, review.lesson_id)}</strong>
                        <span>{formatDate(review.reviewed_at)}</span>
                      </div>
                      <span className={`${styles.ratingBadge} ${styles[review.rating]}`}>
                        {ratingLabels[review.rating]}
                      </span>
                    </div>
                  ))}
                  {!recentReviews.length && <p className={styles.muted}>Ende nuk ka vlerësime.</p>}
                </div>
              </article>
            </section>
          </>
        )}

        <MetabaseProgressAnalytics
          siteUrl={metabase.siteUrl}
          dashboardId={metabase.dashboardId}
        />
      </div>
    </main>
  );
}
