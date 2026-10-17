import { chapterPdfs, pdfCoverUrl, pdfDownloadUrl, type ChapterPdf } from "@/lib/chapter-pdfs";
import styles from "./chapter-pdfs.module.css";

export default function ChapterPdfSection({ chapterId, resources, isAdmin = false }: {
  chapterId: string;
  resources?: ChapterPdf[] | null;
  isAdmin?: boolean;
}) {
  const pdfs = chapterPdfs(resources);
  const pages = pdfs.length && pdfs.every(pdf => Number.isFinite(pdf.pageCount) && Number(pdf.pageCount) > 0)
    ? pdfs.reduce((sum, pdf) => sum + Number(pdf.pageCount), 0) : 0;
  return (
    <section className={styles.section} aria-labelledby="chapter-pdf-heading" data-chapter-pdfs data-chapter-id={chapterId}>
      <div className={styles.heading}>
        <div>
          <span className="eyebrow">Materiale të kapitullit</span>
          <h2 id="chapter-pdf-heading">PDF / Harta mendore</h2>
          <p>Lexo online ose ruaje për më vonë.</p>
        </div>
        <div className={styles.summary}><span className={styles.count}>{pdfs.length} PDF</span>{pages > 0 && <span>{pages} faqe</span>}</div>
      </div>
      {pdfs.length ? (
        <div className={styles.grid}>
          {pdfs.map((pdf) => {
            const cover = pdfCoverUrl(pdf.coverUrl);
            const title = pdf.title || pdf.originalFilename || "Material PDF";
            return (
            <article className={styles.card} key={pdf.url} aria-label={title}>
              <div className={styles.cover} aria-hidden="true">
                {cover ? <img src={cover} alt="" width={260} height={360} loading="lazy" decoding="async" /> : <svg viewBox="0 0 48 56" fill="none"><path d="M9 2h21l13 13v37a2 2 0 0 1-2 2H9a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="2"/><path d="M29 2v14h14M15 29h18M15 36h18M15 43h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
                <span className={styles.fileType}>PDF</span>
              </div>
              <div className={styles.copy}>
                <h3>{title}</h3>
                {pdf.description && <p>{pdf.description}</p>}
                <span className={styles.metadata}>
                  {pdf.pageCount ? <span>{pdf.pageCount} faqe</span> : <span>Dokument PDF</span>}
                  {pdf.size ? <span>{(pdf.size / 1000000).toLocaleString("sq-AL", { maximumFractionDigits: 1 })} MB</span> : null}
                </span>
              </div>
              <div className={styles.actions}>
                <a className={styles.open} href={pdf.url} target="_blank" rel="noopener noreferrer" aria-label={`Hape PDF: ${title} (në skedë të re)`}>Hape PDF <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
                <a className={styles.download} href={pdfDownloadUrl(pdf)} download={pdf.originalFilename || true} aria-label={`Shkarko PDF: ${title}`}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg><span>Shkarko</span></a>
              </div>
            </article>
          );})}
        </div>
      ) : (
        <p className={styles.empty}>Ende nuk ka PDF në këtë kapitull. Materialet do të shfaqen këtu pasi të shtohen.</p>
      )}
      {isAdmin && <p className={styles.admin}>PDF të reja mund të ngarkohen në Sanity Studio → Kapitujt → ky kapitull → PDF / Harta mendore.</p>}
    </section>
  );
}
