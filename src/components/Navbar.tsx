'use client';

import { Bars3Icon, BellIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./Logo";
import SearchModal from "./SearchModal";
import type { User } from "@/lib/types";
import type { Movie } from "@/lib/types";

type Props = {
  user: User | null;
  onSelectMovie?: (movie: Movie) => void;
};

const links = [
  { href: "/", label: "Home" },
  { href: "/favorites", label: "My List" },
  { href: "/profile", label: "Profile" },
  { href: "/#new", label: "New & Hot" },
];

export default function Navbar({ user, onSelectMovie }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50"
    >
      <div className="glass mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-3 backdrop-saturate-150 md:px-6">
        <div className="flex items-center gap-4">
          <Logo />
          <nav className="hidden items-center gap-4 text-sm text-slate-200/80 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-white ${
                  pathname === link.href ? "text-white" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 text-slate-100">
          <button
            className="rounded-full p-2 hover:bg-white/10"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
          </button>
          <button
            className="hidden rounded-full p-2 hover:bg-white/10 sm:block"
            aria-label="Notifications"
            onClick={() => setNotifOpen((v) => !v)}
          >
            <BellIcon className="h-5 w-5" />
          </button>
          {user ? (
            <>
              <div className="hidden text-sm font-medium text-slate-100 sm:block">
                Hi, {user.name.split(" ")[0]}
              </div>
              <button
                onClick={handleLogout}
                className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition hover:shadow-red-900/50"
            >
              Sign in
            </Link>
          )}
          <button
            className="rounded-full p-2 hover:bg-white/10 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mx-auto mt-2 max-w-6xl rounded-xl bg-black/70 px-4 py-3 text-sm text-slate-100 shadow-lg md:hidden"
        >
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="py-1">
                {link.label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={handleLogout}
                className="rounded-lg bg-white/10 px-3 py-2 text-left font-semibold text-white"
              >
                Log out
              </button>
            ) : (
              <Link
                href="/signup"
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-left font-semibold text-white"
              >
                Sign up
              </Link>
            )}
          </div>
        </motion.div>
      )}

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(movie) => onSelectMovie?.(movie)}
      />

      <AnimatePresence>
        {notifOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-4 top-16 z-50 w-64 rounded-xl border border-white/10 bg-black/80 p-3 text-sm text-slate-200 shadow-xl"
          >
            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              Notifications
            </div>
            <p className="text-slate-300">No new notifications yet.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
