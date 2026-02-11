'use client';

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useTransition, useState } from "react";
import MovieCard from "./MovieCard";
import type { Movie, User } from "@/lib/types";

type Props = {
  title: string;
  movies: Movie[];
  favorites?: Movie[];
  user: User | null;
  anchorId?: string;
  onPlay?: (movie: Movie) => void;
};

export default function Row({
  title,
  movies,
  favorites = [],
  user,
  anchorId,
  onPlay,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [favoriteIds, setFavoriteIds] = useState(
    new Set(favorites.map((f) => (f.imdbId ? f.imdbId : f.id))),
  );

  const movieFavoriteIds = useMemo(() => favoriteIds, [favoriteIds]);

  const handleFavorite = (movie: Movie) => {
    if (!user) {
      router.push("/login");
      return;
    }
    const toggleId = movie.imdbId ?? movie.id;
    startTransition(async () => {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.imdbId ? null : movie.id,
          imdbId: movie.imdbId ?? null,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (data.favorite) {
          next.add(toggleId);
        } else {
          next.delete(toggleId);
        }
        return next;
      });
    });
  };

  if (!movies.length) return null;

  return (
    <section id={anchorId} className="space-y-3">
      <div className="flex items-center justify-between">
        <motion.h2
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-lg font-semibold text-white"
        >
          {title}
        </motion.h2>
        {pending && (
          <span className="text-xs text-slate-300/70">Updating…</span>
        )}
      </div>
      <div className="relative overflow-hidden">
        <div className="flex gap-3 overflow-x-auto pb-3">
          {movies.map((movie, idx) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="min-w-[220px] max-w-[240px] flex-1"
            >
              <MovieCard
                movie={movie}
                isFavorite={movieFavoriteIds.has(movie.imdbId ?? movie.id)}
                onFavorite={handleFavorite}
                onPlay={() => onPlay?.(movie)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
