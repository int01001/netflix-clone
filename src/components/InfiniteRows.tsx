'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MovieCard from "./MovieCard";
import TrailerModal from "./TrailerModal";
import type { Movie, User } from "@/lib/types";

type Props = {
  user: User | null;
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
  const sentinel = useRef<HTMLDivElement | null>(null);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.imdbId ?? f.id)),
    [favorites],
  );

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    const term = terms[termIndex % terms.length];
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&page=${page}`);
      const data = await res.json();
      const incoming: Movie[] = (data.results ?? []).filter(Boolean);
      setItems((prev) => {
        const seen = new Set(prev.map((m) => m.imdbId ?? m.id));
        const merged = [...prev];
        incoming.forEach((m) => {
          const key = m.imdbId ?? m.id;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(m);
          }
        });
        return merged;
      });
      setPage((p) => p + 1);
      setTermIndex((i) => (page >= 10 ? i + 1 : i)); // move to next term after 10 pages
      if (page >= 10) setPage(1);
    } catch (e) {
      console.error("infinite load failed", e);
    } finally {
      setLoading(false);
    }
  }, [loading, page, termIndex]);

  useEffect(() => {
    loadMore();
  }, [loadMore]); // initial load

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) loadMore();
        });
      },
      { rootMargin: "400px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">More for you</h2>
        <span className="text-xs text-slate-300">
          {items.length} titles · exploring “{terms[termIndex % terms.length]}”
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {items.map((movie) => (
          <MovieCard
            key={movie.slug}
            movie={movie}
            isFavorite={favoriteIds.has(movie.imdbId ?? movie.id)}
            onPlay={setActive}
          />
        ))}
      </div>
      <div ref={sentinel} className="h-10 w-full" />
      {loading && (
        <p className="text-center text-sm text-slate-400">Loading more...</p>
      )}
      <TrailerModal movie={active} onClose={() => setActive(null)} />
    </div>
  );
}
