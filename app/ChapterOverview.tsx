import { chapterPdfs, pdfCoverUrl, type ChapterPdf } from "@/lib/chapter-pdfs";
import styles from "./chapter-overview.module.css";

export default function ChapterOverview({ title, summary, gradeTitle, lessonCount, flashcardCount, resources }: {
  title: string;
  summary?: string;
  gradeTitle: string;
  lessonCount: number;
  flashcardCount: number;
  resources?: ChapterPdf[] | null;
}) {
  const pdfs = chapterPdfs(resources);
  const covers = pdfs.map(pdf => pdfCoverUrl(pdf.coverUrl)).filter((url): url is string => Boolean(url)).slice(0, 3);

  return (
    <section className={`chapter-hero ${styles.hero}`} data-chapter-overview>
      <div className={styles.copy}>
        <span className={`eyebrow ${styles.eyebrow}`}><i aria-hidden="true" />Kapitulli · {gradeTitle}</span>
        <h1>{title}</h1>
        <p>{summary || "Mësimet dhe flashcards e këtij kapitulli."}</p>
        <dl className={styles.metrics}>
          <div><dt>Mësime</dt><dd>{lessonCount}</dd></div>
          <div><dt>Flashcards</dt><dd>{flashcardCount}</dd></div>
          {pdfs.length > 0 && <div><dt>PDF</dt><dd>{pdfs.length}</dd></div>}
        </dl>
      </div>
      {covers.length > 0 && <div className={styles.books} aria-hidden="true">
        {covers.map(url => <img key={url} src={url} alt="" width={102} height={153} loading="lazy" decoding="async" />)}
      </div>}
    </section>
  );
}
