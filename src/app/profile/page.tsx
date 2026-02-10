import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(229,9,20,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_35%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/60 to-[#05060a]" />
      <div className="relative mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 md:px-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-bold text-white">
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div>
              <p className="text-lg font-semibold">{user.name}</p>
              <p className="text-sm text-slate-300">{user.email}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/favorites"
              className="rounded-full bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
            >
              View favorites
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-white/20 px-4 py-2 font-semibold text-white transition hover:border-white/40"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
