import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { safeReturnTo } from "@/lib/auth/redirect";
import SignInForm from "./SignInForm";

export const metadata: Metadata = {
  title: "Kyçu",
  description: "Kyçu në Portalin Mësimor për ta ruajtur progresin dhe shënimet e tua.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  returnTo?: string | string[];
  reason?: string | string[];
  created?: string | string[];
}>;

type SessionPayload = {
  user?: { id?: string };
  session?: { user?: { id?: string } };
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function hasSignedInUser(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const session = value as SessionPayload;
  return Boolean(session.user?.id || session.session?.user?.id);
}

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);

  let signedIn = false;
  try {
    const { data: session } = await auth.getSession();
    signedIn = hasSignedInUser(session);
  } catch {
    signedIn = false;
  }

  if (signedIn) redirect(returnTo);

  const reason = first(params.reason);
  const created = first(params.created);
  let notice: string | null = null;
  let noticeTone: "info" | "success" | "warning" = "info";

  if (created === "1") {
    notice = "Llogaria u krijua. Kyçu për të vazhduar.";
    noticeTone = "success";
  } else if (reason === "session-expired") {
    notice = "Sesioni yt ka përfunduar. Kyçu përsëri për ta vazhduar progresin.";
    noticeTone = "warning";
  } else if (reason === "google") {
    notice = "Kyçja me Google nuk u përfundua. Provo përsëri ose vazhdo si nxënës.";
    noticeTone = "warning";
  }

  return <SignInForm returnTo={returnTo} notice={notice} noticeTone={noticeTone} />;
}
