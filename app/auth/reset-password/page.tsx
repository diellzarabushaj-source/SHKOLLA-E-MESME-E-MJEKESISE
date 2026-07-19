import type { Metadata } from "next";
import { safeReturnTo } from "@/lib/auth/redirect";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Vendos password të ri",
  description: "Vendos një password të ri për llogarinë.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  token?: string | string[];
  error?: string | string[];
  returnTo?: string | string[];
}>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return (
    <ResetPasswordForm
      token={first(params.token).slice(0, 2048)}
      invalidToken={Boolean(first(params.error))}
      returnTo={safeReturnTo(params.returnTo)}
    />
  );
}
