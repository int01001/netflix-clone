'use client';

import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SearchModal from "./SearchModal";
import Logo from "./Logo";
import type { Movie, User } from "@/lib/types";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-colors ${
        scrolled ? "bg-[rgba(5,5,5,0.78)] backdrop-blur-sm" : "top-fade-nav"
      }`}
    >
      <div className="netflix-row-pad py-2">
        <div className="apple-glass flex h-[68px] items-center justify-between gap-3 rounded-2xl px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-5 text-[0.9rem] md:flex">
              {links.map((link) => {
                const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`transition-colors ${
                      active ? "font-medium text-white" : "text-[var(--muted)] hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 text-white">
            <button
              className="rounded p-1.5 text-[var(--muted)] transition hover:text-white"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <MagnifyingGlassIcon className="h-6 w-6" />
            </button>

            <button
              className="hidden rounded p-1.5 text-[var(--muted)] transition hover:text-white sm:block"
              aria-label="Notifications"
              onClick={() => setNotifOpen((value) => !value)}
            >
              <BellIcon className="h-6 w-6" />
            </button>

            {user ? (
              <div className="hidden items-center gap-3 sm:flex">
                <span className="text-sm text-[var(--muted)]">{user.name.split(" ")[0]}</span>
                <button
                  onClick={handleLogout}
                  className="rounded border border-white/30 px-2.5 py-1 text-xs font-semibold text-white transition hover:border-white"
                >
                  Log out
                </button>
              </div>
            ) : (
              <Link href="/login" className="nf-signin">
                Sign in
              </Link>
            )}

            <button
              className="rounded p-1.5 text-[var(--muted)] transition hover:text-white md:hidden"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Open menu"
            >
              {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="netflix-row-pad md:hidden">
          <div className="apple-glass mt-1 rounded-2xl border-t border-white/10 px-4 py-3">
          <div className="flex flex-col gap-2 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded px-1 py-1 text-[var(--muted)] transition hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={handleLogout}
                className="mt-1 w-fit rounded border border-white/30 px-2.5 py-1 text-xs font-semibold text-white"
              >
                Log out
              </button>
            ) : (
              <Link href="/signup" className="mt-1 w-fit rounded bg-[#e50914] px-3 py-1.5 text-xs font-semibold">
                Sign up
              </Link>
            )}
          </div>
          </div>
        </div>
      )}

      {notifOpen && (
        <div className="netflix-row-pad pointer-events-none absolute right-0 top-[70px] z-50 w-full">
          <div className="apple-glass pointer-events-auto ml-auto w-[260px] rounded-xl p-3 text-sm text-[var(--muted)] shadow-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Notifications
            </p>
            <p>No new notifications.</p>
          </div>
        </div>
      )}

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(movie) => onSelectMovie?.(movie)}
      />
    </header>
  );
}
