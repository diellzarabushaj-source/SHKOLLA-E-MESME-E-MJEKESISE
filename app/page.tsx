import "./search-bar.css";
import SchoolLearningPortal from "./SchoolLearningPortal";
import { currentSessionUser, isCurrentUserAdmin } from "@/lib/admin/server";
import { fetchPortalGrades } from "@/lib/sanity/portal";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // The session lookup and the portal read do not depend on each other, so they
  // run together instead of stacking two round trips in front of the first byte.
  const [user, initialGrades] = await Promise.all([
    currentSessionUser(),
    fetchPortalGrades(),
  ]);
  const isAdmin = await isCurrentUserAdmin(user);

  return (
    <SchoolLearningPortal
      isAdmin={isAdmin}
      isAuthenticated={Boolean(user?.id)}
      initialGrades={initialGrades}
    />
  );
}
