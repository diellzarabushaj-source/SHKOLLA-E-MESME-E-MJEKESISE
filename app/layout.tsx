import type { Metadata } from "next";
import { auth } from "@/lib/auth/server";
import AuthControls from "./AuthControls";
import StethoscopeLogo from "./StethoscopeLogo";
import ThemeToggle from "./ThemeToggle";
import "./globals.css";
import "./uiverse.css";
import "./branding.css";

export const metadata: Metadata = {
  title: "Portali Mësimor — Mjekësi Pejë",
  description: "Mësime dhe flashcards për klasat 10, 11 dhe 12 të Shkollës së Mesme të Mjekësisë.",
};

export const dynamic = "force-dynamic";

const themeScript = `
  try {
    const saved = localStorage.getItem("flashcards-theme");
    const theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = "dark";
  }
`;

async function getCurrentUsername(): Promise<string | null> {
  try {
    const { data: session } = await auth.getSession();
    return session?.user?.name || null;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const username = await getCurrentUsername();

  return (
    <html lang="sq" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <header className="site-header">
          <a className="brand" href="/" aria-label="Portali Mësimor Mjekësi Pejë - Ballina">
            <span className="brand-mark"><StethoscopeLogo /></span>
            <span><b>Portali Mësimor</b><small>Mjekësi Pejë</small></span>
          </a>

          <div className="header-actions">
            <nav className="navigation-card" aria-label="Navigimi kryesor">
              <a className="tab" href="/" aria-label="Ballina" data-label="Ballina">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m3 10.8 9-7.3 9 7.3v8.7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-8.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </a>
              <a className="tab" href="/#klasat" aria-label="Klasat" data-label="Klasat">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M18 7h1a2 2 0 0 1 2 2v10.5h-3M8.5 9h6M8.5 12.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </a>
              <a className="tab" href="https://flashcards-mjekesi-peje.sanity.studio/" target="_blank" rel="noreferrer" aria-label="Sanity Studio" data-label="Studio">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 19.5h4l11-11a2.12 2.12 0 0 0-3-3l-11 11-1 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="m14.5 7 3 3M4 21h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </a>
            </nav>
            <AuthControls username={username} />
            <ThemeToggle />
          </div>
        </header>
        {children}
        <footer><span>Shkolla e Mesme e Mjekësisë, Pejë</span><span>Sanity + Vercel + Neon</span></footer>
      </body>
    </html>
  );
}
