'use client';

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

  const isGrid = layout === "grid";
  const movieFavoriteIds = useMemo(() => favoriteIds, [favoriteIds]);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
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

  const scrollByBlock = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(Math.floor(el.clientWidth * 0.9), 360);
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
      <div className="flex items-center justify-between gap-3">
        <h2 className="netflix-headline">{title}</h2>
        {pending && <span className="text-xs text-[var(--muted)]">Updating...</span>}
      </div>

      <div className="relative group/row">
        {!isGrid && (
          <>
            <button
              onClick={() => scrollByBlock(-1)}
              aria-label="Scroll left"
              disabled={!canScrollLeft}
              className={`absolute left-0 top-0 z-20 flex h-full w-10 items-center justify-center bg-[rgba(20,20,20,0.66)] text-white transition ${
                canScrollLeft
                  ? "opacity-0 group-hover/row:opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
            >
              <ChevronLeftIcon className="h-7 w-7" />
            </button>

            <button
              onClick={() => scrollByBlock(1)}
              aria-label="Scroll right"
              disabled={!canScrollRight}
              className={`absolute right-0 top-0 z-20 flex h-full w-10 items-center justify-center bg-[rgba(20,20,20,0.66)] text-white transition ${
                canScrollRight
                  ? "opacity-0 group-hover/row:opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
            >
              <ChevronRightIcon className="h-7 w-7" />
            </button>
          </>
        )}

        <div
          ref={scrollerRef}
          className={
            isGrid
              ? "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
              : "hide-scrollbar flex gap-2 overflow-x-auto overflow-y-visible pb-2 pt-1"
          }
        >
          {movies.map((movie) => (
            <div
              key={movie.imdbId ?? movie.id}
              className={isGrid ? "min-w-0" : "min-w-[220px] sm:min-w-[240px] md:min-w-[260px]"}
            >
              <MovieCard
                movie={movie}
                isFavorite={movieFavoriteIds.has(movie.imdbId ?? movie.id)}
                onFavorite={handleFavorite}
                onPlay={() => onPlay?.(movie)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
