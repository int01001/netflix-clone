import ClientHome from "@/components/ClientHome";
import { getCurrentUser, getHomeSections } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const sections = await getHomeSections(user?.id);

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(229,9,20,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_35%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/60 to-[#05060a]" />

      <ClientHome sections={sections} user={user} />
    </div>
  );
}
