import { notFound } from "next/navigation";
import RuntimeAuditHarness from "./RuntimeAuditHarness";

export const dynamic = "force-dynamic";

export default function RuntimeAuditPage() {
  if (process.env.E2E_ADMIN_AUDIT !== "1") notFound();
  return <RuntimeAuditHarness />;
}
