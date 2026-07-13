import Link from "next/link";

export default function NotFound() {
  return (
    <main className="system-page">
      <section className="system-card">
        <span className="eyebrow">404</span>
        <h1>Faqja nuk u gjet</h1>
        <p>Linku mund të jetë ndryshuar ose faqja nuk ekziston më. Kthehu në portal dhe vazhdo mësimin.</p>
        <div className="system-card-actions">
          <Link className="primary-action" href="/">Kthehu në ballinë</Link>
          <Link href="/progress">Shiko progresin</Link>
        </div>
      </section>
    </main>
  );
}
