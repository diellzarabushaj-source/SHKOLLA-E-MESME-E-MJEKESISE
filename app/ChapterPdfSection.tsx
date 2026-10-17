import { chapterPdfs, pdfCoverUrl, pdfDownloadUrl, type ChapterPdf } from "@/lib/chapter-pdfs";
import styles from "./chapter-pdfs.module.css";
import ChapterPdfCover from "./ChapterPdfCover";

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
          {pdfs.map((pdf, index) => {
            const cover = pdfCoverUrl(pdf.coverUrl);
            const title = pdf.title || pdf.originalFilename || "Material PDF";
            return (
            <article className={styles.card} key={pdf.url} aria-label={title}>
              <a className={styles.preview} href={pdf.url} target="_blank" rel="noopener noreferrer" aria-label={`Shiko ${title} (PDF, në skedë të re)`}>
              <div className={styles.cover} aria-hidden="true">
                <ChapterPdfCover src={cover} />
                <span className={styles.fileType}>PDF</span>
                <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className={styles.copy}>
                <h3>{title}</h3>
                {pdf.description && <p>{pdf.description}</p>}
                <span className={styles.metadata}>
                  {Number.isFinite(pdf.pageCount) && Number(pdf.pageCount) > 0 ? <span>{pdf.pageCount} faqe</span> : <span>Dokument PDF</span>}
                  {Number.isFinite(pdf.size) && Number(pdf.size) > 0 ? <span>{(Number(pdf.size) / 1000000).toLocaleString("sq-AL", { maximumFractionDigits: 1 })} MB</span> : null}
                </span>
              </div>
              </a>
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
      {pdfs.length > 0 && <p className={styles.hint}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-9v.5" /></svg><span>PDF-të hapen në skedë të re. Për lexim pa internet, shkarkoji në pajisje.</span></p>}
      {isAdmin && <p className={styles.admin}>PDF të reja mund të ngarkohen në Sanity Studio → Kapitujt → ky kapitull → PDF / Harta mendore.</p>}
    </section>
  );
}
