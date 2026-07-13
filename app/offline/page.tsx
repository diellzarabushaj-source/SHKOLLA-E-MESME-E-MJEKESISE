import Link from "next/link";

export const metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="system-page">
      <section className="system-card">
        <span className="system-code">OFFLINE</span>
        <h1>Nuk ka lidhje me internet</h1>
        <p>Mësimet dhe flashcards që i ke hapur më parë mund të vazhdojnë të funksionojnë nga cache-i i aplikacionit.</p>
        <div className="system-actions">
          <Link className="primary-button" href="/">Hape portalin</Link>
          <button className="secondary-button" type="button" onClick={undefined}>Rifresko kur të kthehet interneti</button>
        </div>
      </section>
    </main>
  );
}
