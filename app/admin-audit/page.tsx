import { notFound } from "next/navigation";
import AdminEditorAuditHarness from "./AdminEditorAuditHarness";

export const dynamic = "force-dynamic";

export default function AdminAuditPage() {
  if (process.env.E2E_ADMIN_AUDIT !== "1") notFound();
  return <AdminEditorAuditHarness />;
}
