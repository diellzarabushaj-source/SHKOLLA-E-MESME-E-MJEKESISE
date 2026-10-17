import { chapterPdfs, pdfDownloadUrl, type ChapterPdf } from "@/lib/chapter-pdfs";
import styles from "./chapter-pdfs.module.css";

export default function ChapterPdfSection({ chapterId, resources, isAdmin = false }: {
  chapterId: string;
  resources?: ChapterPdf[] | null;
  isAdmin?: boolean;
}) {
  const pdfs = chapterPdfs(resources);
  return (
    <section className={styles.section} aria-labelledby="chapter-pdf-heading" data-chapter-pdfs data-chapter-id={chapterId}>
      <div className={styles.heading}>
        <div>
          <span className="eyebrow">Materiale të kapitullit</span>
          <h2 id="chapter-pdf-heading">PDF / Harta mendore</h2>
          <p>Hap ose shkarko materialet për t’i lexuar dhe përsëritur.</p>
        </div>
        <span className={styles.count}>{pdfs.length} PDF</span>
      </div>
      {pdfs.length ? (
        <div className={styles.grid}>
          {pdfs.map((pdf) => (
            <article className={styles.card} key={pdf.url}>
              <span className={styles.icon} aria-hidden="true">PDF</span>
              <div className={styles.copy}>
                <h3>{pdf.title || pdf.originalFilename || "Material PDF"}</h3>
                {pdf.description && <p>{pdf.description}</p>}
                <span className={styles.metadata}>
                  PDF{pdf.pageCount ? ` · ${pdf.pageCount} faqe` : ""}
                  {pdf.size ? ` · ${(pdf.size / 1000000).toLocaleString("sq-AL", { maximumFractionDigits: 1 })} MB` : ""}
                </span>
              </div>
              <div className={styles.actions}>
                <a className={styles.open} href={pdf.url} target="_blank" rel="noopener noreferrer" aria-label={`Hape PDF: ${pdf.title} (në skedë të re)`}>Hape PDF <span aria-hidden="true">↗</span></a>
                <a href={pdfDownloadUrl(pdf)} download={pdf.originalFilename || true} aria-label={`Shkarko PDF: ${pdf.title}`}>Shkarko <span aria-hidden="true">↓</span></a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Ende nuk ka PDF në këtë kapitull. Materialet do të shfaqen këtu pasi të shtohen.</p>
      )}
      {isAdmin && <p className={styles.admin}>PDF të reja mund të ngarkohen në Sanity Studio → Kapitujt → ky kapitull → PDF / Harta mendore.</p>}
    </section>
  );
}
