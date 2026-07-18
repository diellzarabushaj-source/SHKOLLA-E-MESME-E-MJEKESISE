import "./search-bar.css";
import SchoolLearningPortal from "./SchoolLearningPortal";
import { currentSessionUser, isCurrentUserAdmin } from "@/lib/admin/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentSessionUser();
  const isAdmin = await isCurrentUserAdmin(user);

  return (
    <SchoolLearningPortal
      isAdmin={isAdmin}
      isAuthenticated={Boolean(user?.id)}
    />
  );
}
