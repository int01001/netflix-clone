'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MovieCard from "./MovieCard";
import TrailerModal from "./TrailerModal";
import type { Movie } from "@/lib/types";

type Props = {
  favorites?: Movie[];
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

export default function InfiniteRows({ favorites = [] }: Props) {
  const [items, setItems] = useState<Movie[]>([]);
  const [termIndex, setTermIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<Movie | null>(null);

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
      setPage(nextPage);
      setTermIndex(nextTerm);
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
        <h2 className="text-xl font-semibold text-white">More for you</h2>
        <span className="text-xs text-slate-300">
          {items.length} titles - exploring {terms[termIndex % terms.length]} (p{page})
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {items.map((movie) => (
          <MovieCard
            key={movie.imdbId ?? movie.slug}
            movie={movie}
            isFavorite={favoriteIds.has(movie.imdbId ?? movie.id)}
            onPlay={setActive}
          />
        ))}
      </div>

      <div ref={sentinel} className="h-10 w-full" />
      {loading && <p className="text-center text-sm text-slate-400">Loading more...</p>}

      <TrailerModal movie={active} onClose={() => setActive(null)} />
    </div>
  );
}
