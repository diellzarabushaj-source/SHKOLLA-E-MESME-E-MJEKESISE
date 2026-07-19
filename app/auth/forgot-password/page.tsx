import type { Metadata } from "next";
import { safeReturnTo } from "@/lib/auth/redirect";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Rikthe password-in",
  description: "Kërko linkun për rikthimin e password-it me email.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ returnTo?: string | string[] }>;

export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <ForgotPasswordForm returnTo={safeReturnTo(params.returnTo)} />;
}
