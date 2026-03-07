import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="app-shell">
      <div className="relative mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 md:px-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        <div className="glass rounded-2xl p-6">
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
              className="btn-primary rounded-full px-4 py-2 font-semibold transition"
            >
              View favorites
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-white/20 bg-white/[0.03] px-4 py-2 font-semibold text-white transition hover:border-[rgba(229,9,20,0.68)] hover:bg-[rgba(229,9,20,0.14)]"
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
