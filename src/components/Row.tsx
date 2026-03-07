'use client';

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import MovieCard from "./MovieCard";
import type { Movie, User } from "@/lib/types";

type Props = {
  title: string;
  movies: Movie[];
  favorites?: Movie[];
  user: User | null;
  anchorId?: string;
  onPlay?: (movie: Movie) => void;
  layout?: "carousel" | "grid";
};

export default function Row({
  title,
  movies,
  favorites = [],
  user,
  anchorId,
  onPlay,
  layout = "carousel",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [favoriteIds, setFavoriteIds] = useState(
    new Set(favorites.map((favorite) => (favorite.imdbId ? favorite.imdbId : favorite.id))),
  );
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const movieFavoriteIds = useMemo(() => favoriteIds, [favoriteIds]);
  const isGrid = layout === "grid";

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    if (isGrid) return;

    const el = scrollerRef.current;
    if (!el) return;

    updateScrollState();
    const onScroll = () => updateScrollState();
    const onResize = () => updateScrollState();

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [isGrid, movies.length, updateScrollState]);

  const scrollByBlocks = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(460, Math.floor(el.clientWidth * 0.82));
    el.scrollBy({ left: amount * direction, behavior: "smooth" });
  };

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
          className="text-lg font-semibold text-white drop-shadow-[0_0_14px_rgba(229,9,20,0.28)]"
        >
          {title}
        </motion.h2>
        {pending && <span className="text-xs text-slate-300/70">Updating...</span>}
      </div>

      <div className="relative overflow-hidden">
        {!isGrid && (
          <>
            <button
              aria-label="Scroll left"
              onClick={() => scrollByBlocks(-1)}
              disabled={!canScrollLeft}
              className={`absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-black/65 p-2 text-white backdrop-blur transition ${
                canScrollLeft
                  ? "opacity-100 hover:border-[rgba(229,9,20,0.8)] hover:bg-[rgba(229,9,20,0.25)]"
                  : "pointer-events-none opacity-0"
              }`}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              aria-label="Scroll right"
              onClick={() => scrollByBlocks(1)}
              disabled={!canScrollRight}
              className={`absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-black/65 p-2 text-white backdrop-blur transition ${
                canScrollRight
                  ? "opacity-100 hover:border-[rgba(229,9,20,0.8)] hover:bg-[rgba(229,9,20,0.25)]"
                  : "pointer-events-none opacity-0"
              }`}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-black/85 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-black/85 to-transparent" />
          </>
        )}

        <div
          ref={scrollerRef}
          className={
            isGrid
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "hide-scrollbar flex gap-3 overflow-x-auto pb-3"
          }
        >
          {movies.map((movie, idx) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={isGrid ? "min-w-0" : "min-w-[220px] max-w-[240px] flex-1"}
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
