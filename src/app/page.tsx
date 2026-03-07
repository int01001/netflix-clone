import ClientHome from "@/components/ClientHome";
import { getCurrentUser, getHomeSections } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const sections = await getHomeSections(user?.id);

  return (
    <div className="app-shell">
      <ClientHome sections={sections} user={user} />
    </div>
  );
}
