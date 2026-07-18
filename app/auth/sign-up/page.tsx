import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { safeReturnTo } from "@/lib/auth/redirect";
import SignUpForm from "./SignUpForm";

export const metadata: Metadata = {
  title: "Krijo llogari",
  description: "Krijo llogari në Portalin Mësimor vetëm me username dhe password.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  returnTo?: string | string[];
}>;

type SessionPayload = {
  user?: { id?: string };
  session?: { user?: { id?: string } };
};

function hasSignedInUser(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const session = value as SessionPayload;
  return Boolean(session.user?.id || session.session?.user?.id);
}

export default async function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
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

  return <SignUpForm returnTo={returnTo} />;
}
