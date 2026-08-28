import Link from "next/link";
import { auth } from "@/lib/auth/server";
import { isCurrentUserAdmin } from "@/lib/admin/server";
import { fetchPortalGrades, type PortalGrades } from "@/lib/sanity/portal";
import ProgressDashboard, { type ProgressContentLabels } from "./ProgressDashboard";
import styles from "./progress.module.css";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function textValue(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildContentLabels(grades: PortalGrades | null): ProgressContentLabels {
  const labels: ProgressContentLabels = {
    grades: {},
    subjects: {},
    chapters: {},
    lessons: {},
  };

  for (const gradeValue of grades || []) {
    const grade = asRecord(gradeValue);
    if (!grade) continue;
    const gradeId = textValue(grade, "_id");
    const gradeTitle = textValue(grade, "title");
    if (gradeId && gradeTitle) labels.grades[gradeId] = gradeTitle;

    const subjects = Array.isArray(grade.subjects) ? grade.subjects : [];
    for (const subjectValue of subjects) {
      const subject = asRecord(subjectValue);
      if (!subject) continue;
      const subjectId = textValue(subject, "_id");
      const subjectTitle = textValue(subject, "title");
      if (subjectId && subjectTitle) labels.subjects[subjectId] = subjectTitle;

      const chapters = Array.isArray(subject.chapters) ? subject.chapters : [];
      for (const chapterValue of chapters) {
        const chapter = asRecord(chapterValue);
        if (!chapter) continue;
        const chapterId = textValue(chapter, "_id");
        const chapterTitle = textValue(chapter, "title");
        if (chapterId && chapterTitle) labels.chapters[chapterId] = chapterTitle;

        const lessons = Array.isArray(chapter.lessons) ? chapter.lessons : [];
        for (const lessonValue of lessons) {
          const lesson = asRecord(lessonValue);
          if (!lesson) continue;
          const lessonId = textValue(lesson, "_id");
          const lessonTitle = textValue(lesson, "title");
          if (lessonId && lessonTitle) labels.lessons[lessonId] = lessonTitle;
        }
      }
    }
  }

  return labels;
}

function normalizedMetabaseUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizedDashboardId(value: string | undefined): string | null {
  const candidate = value?.trim() || "";
  return /^\d+$/.test(candidate) && Number(candidate) > 0 ? candidate : null;
}

export default async function ProgressPage() {
  const [{ data: session }, grades] = await Promise.all([
    auth.getSession(),
    fetchPortalGrades(),
  ]);

  const username = session?.user?.name || null;
  const isAdmin = await isCurrentUserAdmin(session?.user || null);

  if (!session?.user || !username) {
    return (
      <main className={styles.page}>
        <section className={styles.loginCard}>
          <span className={styles.eyebrow}>Progres privat</span>
          <h1>Kyçu për ta parë progresin tënd</h1>
          <p>
            Progresi i çdo nxënësi është i ndarë. Pas kyçjes, aktiviteti,
            sesionet dhe rezultatet sinkronizohen me llogarinë tënde.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/auth/sign-in">Kyçu</Link>
            <Link className={styles.secondaryButton} href="/auth/sign-up">Krijo llogari</Link>
          </div>
        </section>
      </main>
    );
  }

  const metabaseSiteUrl = normalizedMetabaseUrl(
    process.env.METABASE_SITE_URL || process.env.METABASE_INSTANCE_URL,
  );
  const metabaseDashboardId = normalizedDashboardId(
    process.env.METABASE_PROGRESS_DASHBOARD_ID || process.env.METABASE_DASHBOARD_ID,
  );
  const metabaseEnabled = Boolean(
    metabaseSiteUrl
    && metabaseDashboardId
    && process.env.METABASE_EMBED_SECRET?.trim(),
  );
  const metabase = {
    enabled: metabaseEnabled,
    siteUrl: metabaseSiteUrl,
    dashboardId: metabaseDashboardId,
  };

  return (
    <ProgressDashboard
      username={username}
      labels={buildContentLabels(grades)}
      metabase={metabase}
      isAdmin={isAdmin}
    />
  );
}
