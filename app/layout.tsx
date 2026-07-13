import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth/server";
import AuthControls from "./AuthControls";
import EnhancedTestResults from "./EnhancedTestResults";
import InteractionEnhancements from "./InteractionEnhancements";
import LearningActivityTracker from "./LearningActivityTracker";
import MobileNavigation from "./MobileNavigation";
import ProgressTracker from "./ProgressTracker";
import PwaRegistrar from "./PwaRegistrar";
import StethoscopeLogo from "./StethoscopeLogo";
import ThemeToggle from "./ThemeToggle";
import "./globals.css";
import "./uiverse.css";
import "./branding.css";
import "./action-buttons.css";
import "./progress.css";
import "./lesson-rich.css";
import "./system-pages.css";
import "./test-results.css";
import "./interaction-enhancements.css";
import "./mobile-study-fixes.css";

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://shkolla-e-mesme-e-mjekesise-ct9t.vercel.app",
);

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Portali Mësimor — Mjekësi Pejë",
    template: "%s — Mjekësi Pejë",
  },
  description: "Mësime, materiale dhe flashcards për klasat 10, 11 dhe 12 të Shkollës së Mesme të Mjekësisë në Pejë.",
  applicationName: "Portali Mësimor Mjekësi Pejë",
  authors: [{ name: "Shkolla e Mesme e Mjekësisë, Pejë" }],
  creator: "Shkolla e Mesme e Mjekësisë, Pejë",
  keywords: ["mjekësi", "shkollë e mesme", "Pejë", "flashcards", "mësime", "anatomi", "fiziologji"],
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mjekësi Pejë",
  },
  openGraph: {
    type: "website",
    locale: "sq_AL",
    url: "/",
    siteName: "Portali Mësimor Mjekësi Pejë",
    title: "Portali Mësimor — Mjekësi Pejë",
    description: "Mësime dhe flashcards për nxënësit e Shkollës së Mesme të Mjekësisë në Pejë.",
  },
  twitter: { card: "summary", title: "Portali Mësimor — Mjekësi Pejë", description: "Mësime dhe flashcards për klasat 10, 11 dhe 12." },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07111f" },
    { media: "(prefers-color-scheme: light)", color: "#f4f7fc" },
  ],
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

function NavigationLinks({ className, label }: { className: string; label: string }) {
  return (
    <nav className={`navigation-card ${className}`} aria-label={label}>
      <Link className="tab" href="/" aria-label="Ballina" data-label="Ballina">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 10.8 9-7.3 9 7.3v8.7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-8.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
      </Link>
      <Link className="tab" href="/#klasat" aria-label="Klasat" data-label="Klasat">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M18 7h1a2 2 0 0 1 2 2v10.5h-3M8.5 9h6M8.5 12.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </Link>
      <Link className="tab" href="/progress" aria-label="Progresi im" data-label="Progresi">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M3 19.5h19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </Link>
    </nav>
  );
}

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
        <a className="skip-link" href="#main-content">Kalo direkt te përmbajtja</a>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Portali Mësimor Mjekësi Pejë - Ballina">
            <span className="brand-mark"><StethoscopeLogo /></span>
            <span><b>Portali Mësimor</b><small>Mjekësi Pejë</small></span>
          </Link>
          <div className="header-actions">
            <NavigationLinks className="desktop-navigation" label="Navigimi kryesor" />
            <AuthControls username={username} />
            <ThemeToggle />
          </div>
        </header>
        <MobileNavigation />
        <ProgressTracker />
        <EnhancedTestResults />
        <InteractionEnhancements />
        {username && <LearningActivityTracker />}
        <PwaRegistrar />
        <div id="main-content" tabIndex={-1}>{children}</div>
        <footer><span>Shkolla e Mesme e Mjekësisë, Pejë</span><span>Platformë mësimore për nxënësit</span></footer>
      </body>
    </html>
  );
}
