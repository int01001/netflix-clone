'use client';

import { PlayIcon, PlusIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Movie, User } from "@/lib/types";

type Props = {
  movie: Movie;
  user: User | null;
  isFavorite?: boolean;
  onPlay?: () => void;
};

export default function Hero({ movie, user, isFavorite, onPlay }: Props) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(isFavorite ?? false);
  const [pending, startTransition] = useTransition();
  const fallbackImage =
    "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1600&q=80";
  const heroImage =
    movie.backdropUrl && movie.backdropUrl !== "N/A"
      ? movie.backdropUrl
      : movie.thumbnailUrl && movie.thumbnailUrl !== "N/A"
        ? movie.thumbnailUrl
        : fallbackImage;

  const toggleFavorite = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.imdbId ? null : movie.id,
          imdbId: movie.imdbId ?? null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFavorite(data.favorite);
      }
    });
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-black/50">
      <div className="absolute inset-0 opacity-40">
        <Image
          src={heroImage.startsWith("http") ? heroImage : fallbackImage}
          alt={movie.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
      </div>

      <div className="relative grid gap-6 px-6 py-12 sm:px-10 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:py-16">
        <div className="space-y-4">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-200"
          >
            New & Trending
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl"
          >
            {movie.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl text-base text-slate-200/80 sm:text-lg"
          >
            {movie.tagline ?? movie.description}
          </motion.p>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200/70">
            {movie.year && <span>{movie.year}</span>}
            {movie.durationMinutes && <span>{movie.durationMinutes} min</span>}
            {movie.genre && (
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs uppercase tracking-wide text-white">
                {movie.genre}
              </span>
            )}
            {movie.rating && (
              <span className="flex items-center gap-1 text-amber-300">
                ★ {movie.rating}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-lg shadow-white/20 transition hover:translate-y-0.5 hover:shadow-white/30"
              onClick={() => onPlay?.()}
            >
              <PlayIcon className="h-5 w-5" />
              Watch trailer
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={pending}
              onClick={toggleFavorite}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                favorite
                  ? "bg-white/10 text-white ring-2 ring-[var(--accent)]"
                  : "bg-[var(--accent)] text-white shadow-lg shadow-red-900/40 hover:shadow-red-900/60"
              }`}
            >
              <PlusIcon className="h-5 w-5" />
              {favorite ? "In My List" : "Add to My List"}
            </motion.button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl shadow-black/50 lg:block"
        >
          <Image
            src={heroImage.startsWith("http") ? heroImage : fallbackImage}
            alt={movie.title}
            fill
            className="object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}
