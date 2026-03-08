import ClientHome from "@/components/ClientHome";
import { getCurrentUser, getHomeSections } from "@/lib/data";

export const dynamic = "force-dynamic";
const MIN_HOME_LOADING_MS = 1200;

export default async function Home() {
  const user = await getCurrentUser();
  const sections = await getHomeSections(user?.id);
  await new Promise((resolve) => setTimeout(resolve, MIN_HOME_LOADING_MS));

  return (
    <div className="app-shell">
      <ClientHome sections={sections} user={user} />
    </div>
  );
}
