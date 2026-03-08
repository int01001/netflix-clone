'use client';

import { XMarkIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Movie } from "@/lib/types";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });
const MIN_TRAILER_LOADING_MS = 900;

type Props = {
  movie: Movie | null;
  onClose: () => void;
};

export default function TrailerModal({ movie, onClose }: Props) {
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [watchUrl, setWatchUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startSeconds, setStartSeconds] = useState(0);
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const lastSentRef = useRef<number>(0);
  const hasAppliedResumeRef = useRef(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!movie) {
        setTrailerUrl(null);
        setWatchUrl(null);
        setStartSeconds(0);
        return;
      }

      setStartSeconds(0);
      lastSentRef.current = 0;
      hasAppliedResumeRef.current = false;
      setLoading(true);
      const startedAt = Date.now();

      try {
        const isExternal = (movie.imdbId ?? "").startsWith("tmdb:");

        // Fetch existing history to resume.
        const historyParams = new URLSearchParams();
        if (!isExternal) historyParams.set("movieId", String(movie.id));
        if (movie.imdbId) historyParams.set("imdbId", movie.imdbId);

        const historyRes = await fetch(`/api/history?${historyParams.toString()}`, {
          cache: "no-store",
        });
        if (historyRes.ok) {
          const data = await historyRes.json();
          if (data.history?.position_seconds) {
            setStartSeconds(data.history.position_seconds);
          }
        }

        const params = new URLSearchParams();
        if (movie.title) params.set("title", movie.title);
        if (movie.imdbId) params.set("imdbId", movie.imdbId);
        if (movie.tmdbId) params.set("tmdbId", String(movie.tmdbId));

        const res = await fetch(`/api/trailer?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!active) return;

        const getSafe = (u?: string | null) => {
          try {
            if (!u) return null;
            const parsed = new URL(u);
            if (parsed.protocol === "https:" || parsed.protocol === "http:") {
              return parsed.toString();
            }
          } catch {
            return null;
          }
          return null;
        };

        if (!res.ok) {
          setTrailerUrl(null);
          setWatchUrl(null);
          return;
        }

        const validUrl = getSafe(data.url);
        const validWatch = getSafe(data.watchUrl ?? data.url ?? null);

        setTrailerUrl(validUrl);
        setWatchUrl(validWatch);
      } catch (error) {
        console.error(error);
        if (!active) return;
        setTrailerUrl(null);
        setWatchUrl(null);
      } finally {
        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_TRAILER_LOADING_MS) {
          await new Promise((resolve) =>
            setTimeout(resolve, MIN_TRAILER_LOADING_MS - elapsed),
          );
        }
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            className="relative z-10 w-full max-w-5xl overflow-hidden rounded-md border border-white/15 bg-[#181818] shadow-2xl"
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-20 rounded-full bg-black/75 p-2 text-white transition hover:bg-black"
              aria-label="Close trailer"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            <div className="aspect-video w-full bg-black">
              {loading ? (
                <div className="flex h-full items-center justify-center bg-black">
                  <div role="status" aria-label="Loading trailer" className="relative h-16 w-16">
                    <span className="absolute inset-0 rounded-full border-2 border-white/15" />
                    <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#f6121d] border-r-[#e50914]" />
                    <span className="absolute inset-[10px] animate-pulse rounded-full border border-[#e50914]/45" />
                    <span className="sr-only">Loading trailer</span>
                  </div>
                </div>
              ) : trailerUrl ? (
                <ReactPlayer
                  src={trailerUrl}
                  width="100%"
                  height="100%"
                  playing
                  controls
                  playsInline
                  ref={playerRef}
                  config={{
                    youtube: {
                      rel: 0,
                      start: startSeconds > 0 ? startSeconds : undefined,
                    },
                  }}
                  style={{ background: "#000" }}
                  onReady={() => {
                    if (
                      !hasAppliedResumeRef.current &&
                      startSeconds > 0 &&
                      playerRef.current
                    ) {
                      try {
                        playerRef.current.currentTime = startSeconds;
                        hasAppliedResumeRef.current = true;
                      } catch {
                        // Ignore seek errors when provider does not expose currentTime yet.
                      }
                    }
                  }}
                  onTimeUpdate={(event) => {
                    const media = event.currentTarget;
                    const playedSeconds = media.currentTime;
                    if (!Number.isFinite(playedSeconds) || playedSeconds <= 0) return;

                    // Throttle updates to every 5 seconds of progress.
                    if (playedSeconds - lastSentRef.current < 5) return;
                    lastSentRef.current = playedSeconds;

                    const duration = Number.isFinite(media.duration) ? media.duration : 0;

                    fetch("/api/history", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        movieId: (movie.imdbId ?? "").startsWith("tmdb:") ? null : movie.id,
                        imdbId: movie.imdbId ?? null,
                        positionSeconds: Math.floor(playedSeconds),
                        durationSeconds: Math.floor(duration),
                      }),
                    }).catch((err) => console.error("history save failed", err));
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-300">
                  Trailer unavailable
                </div>
              )}
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-[2fr_1fr] sm:items-center">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Trailer</p>
                <h3 className="text-xl font-bold text-white">{movie.title}</h3>
                {movie.description && (
                  <p className="line-clamp-3 text-sm text-[var(--muted)]">{movie.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                  {movie.year && <span>{movie.year}</span>}
                  {movie.genre && (
                    <span className="rounded border border-white/25 px-2 py-1 text-[11px] uppercase tracking-wide text-white">
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
                    className="rounded border border-white/20 bg-white px-3 py-2 text-center font-semibold text-black transition hover:bg-white/80"
                  >
                    Open in new tab
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="rounded border border-white/20 bg-white/[0.03] px-3 py-2 text-center font-semibold text-white/80 transition hover:bg-white/[0.09]"
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
