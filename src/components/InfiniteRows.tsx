'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MovieCard from "./MovieCard";
import type { Movie } from "@/lib/types";

type Props = {
  favorites?: Movie[];
  onPlay?: (movie: Movie) => void;
};

const terms = [
  "action",
  "adventure",
  "drama",
  "sci fi",
  "thriller",
  "fantasy",
  "animation",
  "romance",
  "mystery",
  "crime",
];

export default function InfiniteRows({ favorites = [], onPlay }: Props) {
  const [items, setItems] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const termRef = useRef(0);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((favorite) => favorite.imdbId ?? favorite.id)),
    [favorites],
  );

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    const currentTerm = terms[termRef.current % terms.length];
    const currentPage = pageRef.current;

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(currentTerm)}&page=${currentPage}`,
      );
      const data = await res.json();
      const incoming: Movie[] = (data.results ?? []).filter(Boolean);

      setItems((prev) => {
        const seen = new Set(prev.map((movie) => movie.imdbId ?? movie.id));
        const merged = [...prev];

        incoming.forEach((movie) => {
          const key = movie.imdbId ?? movie.id;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(movie);
          }
        });

        return merged;
      });

      let nextPage = currentPage + 1;
      let nextTerm = termRef.current;

      if (nextPage > 10) {
        nextPage = 1;
        nextTerm += 1;
      }

      pageRef.current = nextPage;
      termRef.current = nextTerm;
    } catch (error) {
      console.error("infinite load failed", error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMore();
          }
        });
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="netflix-headline">More Like This</h2>
        <span className="text-xs text-[var(--muted)]">{items.length} titles</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {items.map((movie) => (
          <MovieCard
            key={movie.imdbId ?? movie.slug}
            movie={movie}
            isFavorite={favoriteIds.has(movie.imdbId ?? movie.id)}
            onPlay={onPlay}
          />
        ))}
      </div>

      <div ref={sentinel} className="h-10 w-full" />
      {loading && <p className="text-center text-sm text-[var(--muted)]">Loading more...</p>}
    </div>
  );
}
