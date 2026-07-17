import "./search-bar.css";
import SchoolLearningPortal from "./SchoolLearningPortal";
import { isCurrentUserAdmin } from "@/lib/admin/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const isAdmin = await isCurrentUserAdmin();
  return <SchoolLearningPortal isAdmin={isAdmin} />;
}
