'use client';

import { XMarkIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { Movie } from "@/lib/types";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

type Props = {
  movie: Movie | null;
  onClose: () => void;
};

export default function TrailerModal({ movie, onClose }: Props) {
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [watchUrl, setWatchUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSafeUrl = (url?: string | null) => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!movie) {
        setTrailerUrl(null);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (movie.title) params.set("title", movie.title);
        if (movie.imdbId) params.set("imdbId", movie.imdbId);
        const res = await fetch(`/api/trailer?${params.toString()}`);
        const data = await res.json();
        if (!active) return;
        if (res.ok && data.url) {
          setTrailerUrl(isSafeUrl(data.url) ? data.url : null);
          setWatchUrl(isSafeUrl(data.watchUrl) ? data.watchUrl : null);
        } else {
          const fallback = `https://www.youtube.com/embed?autoplay=1&modestbranding=1&rel=0&showinfo=0&listType=search&list=${encodeURIComponent(
            `${movie.title} official trailer`,
          )}`;
          setTrailerUrl(fallback);
          setWatchUrl(
            `https://www.youtube.com/results?search_query=${encodeURIComponent(
              `${movie.title} official trailer`,
            )}`,
          );
        }
      } catch (err) {
        console.error(err);
        if (!active) return;
        const fallback = movie
          ? `https://www.youtube.com/embed?autoplay=1&modestbranding=1&rel=0&showinfo=0&listType=search&list=${encodeURIComponent(
              `${movie.title} official trailer`,
            )}`
          : null;
        setTrailerUrl(isSafeUrl(fallback) ? fallback : null);
        setWatchUrl(
          fallback
            ? `https://www.youtube.com/results?search_query=${encodeURIComponent(
                `${movie?.title ?? ""} official trailer`,
              )}`
            : null,
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [movie]);

  return (
    <AnimatePresence>
      {movie && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0f] shadow-2xl"
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-20 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              aria-label="Close trailer"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            <div className="aspect-video w-full bg-black">
              {loading ? (
                <div className="flex h-full items-center justify-center text-slate-300">
                  Fetching trailer…
                </div>
              ) : trailerUrl ? (
                <ReactPlayer
                  url={trailerUrl}
                  width="100%"
                  height="100%"
                  playing
                  controls
                  light={
                    movie.backdropUrl ?? movie.thumbnailUrl ?? undefined ? (
                      <Image
                        src={
                          movie.backdropUrl ??
                          movie.thumbnailUrl ??
                          "/poster-fallback.jpg"
                        }
                        alt={movie.title}
                        fill
                        className="object-cover"
                      />
                    ) : undefined
                  }
                  config={{
                    youtube: { playerVars: { modestbranding: 1, rel: 0 } },
                    file: { attributes: { controlsList: "nodownload" } },
                  }}
                  style={{ background: "#000" }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-300">
                  Trailer unavailable
                </div>
              )}
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-[2fr_1fr] sm:items-center">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-red-200/80">
                  Trailer
                </p>
                <h3 className="text-xl font-bold text-white">{movie.title}</h3>
                {movie.description && (
                  <p className="text-sm text-slate-300/90 line-clamp-3">
                    {movie.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-300/80">
                  {movie.year && <span>{movie.year}</span>}
                  {movie.genre && (
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] uppercase tracking-wide text-white">
                      {movie.genre}
                    </span>
                  )}
                  {movie.durationMinutes && <span>{movie.durationMinutes}m</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm text-slate-200">
                {watchUrl && (
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-white/10 px-3 py-2 text-center font-semibold text-white transition hover:bg-white/15"
                  >
                    Open in new tab
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="rounded-lg border border-white/10 px-3 py-2 text-center font-semibold text-white/80 transition hover:border-white/30"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
