'use client';

import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Movie } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (movie: Movie) => void;
};

const debounce = <T extends (...args: unknown[]) => void>(fn: T, delay: number) => {
  let t: NodeJS.Timeout | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};

export default function SearchModal({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useMemo(
    () =>
      debounce(async (q: string) => {
        if (!q.trim()) {
          setResults([]);
          return;
        }
        setLoading(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          const data = await res.json();
          setResults(data.results ?? []);
        } catch (err) {
          console.error(err);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 280),
    [],
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    doSearch(query);
  }, [query, doSearch, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0"
            onClick={onClose}
            role="presentation"
          />
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="relative mx-auto mt-16 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0b0b0f] p-4 shadow-2xl"
          >
            <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-200/80" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a movie..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
              />
              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-300 hover:bg-white/10"
                aria-label="Close search"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2">
              {loading && (
                <div className="py-6 text-center text-sm text-slate-300">
                  Searching…
                </div>
              )}
              {!loading && results.length === 0 && query.trim() && (
                <div className="py-6 text-center text-sm text-slate-400">
                  No results for “{query}”.
                </div>
              )}
              {!loading &&
                results.map((movie) => (
                  <button
                    key={movie.slug}
                    onClick={() => {
                      onSelect(movie);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-2 text-left transition hover:border-white/15 hover:bg-white/10"
                  >
                    <div className="relative h-16 w-28 overflow-hidden rounded-lg bg-black">
                      {movie.thumbnailUrl && (
                        <Image
                          src={movie.thumbnailUrl}
                          alt={movie.title}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">
                          {movie.title}
                        </p>
                        {movie.year && (
                          <span className="text-xs text-slate-300">{movie.year}</span>
                        )}
                      </div>
                      {movie.genre && (
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          {movie.genre}
                        </p>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-[var(--accent)]">
                      Play
                    </div>
                  </button>
                ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
