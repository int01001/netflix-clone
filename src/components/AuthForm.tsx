'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";

type Mode = "login" | "signup";

type Props = {
  mode: Mode;
};

export default function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const title = mode === "login" ? "Welcome back" : "Create your account";
  const buttonText = mode === "login" ? "Sign in" : "Create account";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Something went wrong");
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-black/50 p-8 shadow-2xl shadow-black/50">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-red-200/80">
          CineWave
        </p>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        <p className="text-sm text-slate-300/80">
          {mode === "login"
            ? "Sign in to continue watching where you left off."
            : "Personalize your watchlist and sync favorites."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" && (
          <label className="block space-y-2">
            <span className="text-sm text-slate-200/80">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none ring-0 transition focus:border-white/40"
              placeholder="Alex Netflixer"
            />
          </label>
        )}
        <label className="block space-y-2">
          <span className="text-sm text-slate-200/80">Email</span>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none ring-0 transition focus:border-white/40"
            placeholder="you@example.com"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-200/80">Password</span>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none ring-0 transition focus:border-white/40"
            placeholder="••••••••"
            minLength={6}
          />
        </label>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-red-900/40 transition hover:shadow-red-900/60 disabled:cursor-not-allowed disabled:opacity-80"
          type="submit"
        >
          {pending ? "Please wait…" : buttonText}
        </motion.button>
      </form>

      <p className="text-center text-sm text-slate-300/80">
        {mode === "login" ? (
          <>
            New to CineWave?{" "}
            <Link className="font-semibold text-white underline" href="/signup">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link className="font-semibold text-white underline" href="/login">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
