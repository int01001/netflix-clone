'use client';

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import MovieCard from "./MovieCard";
import PlaylistPickerModal from "./PlaylistPickerModal";
import type { Movie, User } from "@/lib/types";

type Props = {
  title: string;
  movies: Movie[];
  favorites?: Movie[];
  user: User | null;
  anchorId?: string;
  onPlay?: (movie: Movie) => void;
  layout?: "carousel" | "grid";
  allowRemove?: boolean;
};

export default function Row({
  title,
  movies,
  favorites = [],
  user,
  anchorId,
  onPlay,
  layout = "carousel",
  allowRemove = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [favoriteIds, setFavoriteIds] = useState(
    new Set(favorites.map((favorite) => (favorite.imdbId ? favorite.imdbId : favorite.id))),
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMovie, setPickerMovie] = useState<Movie | null>(null);

  const [visibleMovies, setVisibleMovies] = useState<Movie[]>(movies);

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

  useEffect(() => {
    setVisibleMovies(movies);
  }, [movies]);

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
    if (favoriteIds.has(toggleId)) {
      // For now, remove from the default playlist "My List".
      // Once we add per-playlist membership UI, we can ask where to remove from.
      startTransition(async () => {
        const playlistsRes = await fetch("/api/playlists", { cache: "no-store" });
        if (!playlistsRes.ok) return;
        const playlistsData = (await playlistsRes.json()) as { playlists?: Array<{ id: number; name: string }> };
        const myList = (playlistsData.playlists ?? []).find((p) => p.name === "My List");
        if (!myList) return;

        const res = await fetch("/api/playlists/items", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playlistId: myList.id,
            movieId: movie.imdbId ? null : movie.id,
            imdbId: movie.imdbId ?? null,
          }),
        });

        if (!res.ok) return;
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(toggleId);
          return next;
        });
      });
      return;
    }

    setPickerMovie(movie);
    setPickerOpen(true);
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
          {visibleMovies.map((movie) => (
            <div
              key={movie.imdbId ?? movie.id}
              className={isGrid ? "min-w-0" : "min-w-[220px] sm:min-w-[240px] md:min-w-[260px]"}
            >
              <MovieCard
                movie={movie}
                isFavorite={movieFavoriteIds.has(movie.imdbId ?? movie.id)}
                onFavorite={handleFavorite}
                onPickPlaylist={(picked) => {
                  setPickerMovie(picked);
                  setPickerOpen(true);
                }}
                onPlay={() => onPlay?.(movie)}
                showRemove={allowRemove}
                onRemove={() => {
                  if (!user) {
                    router.push("/login");
                    return;
                  }

                  const key = movie.imdbId ?? movie.id;
                  setVisibleMovies((prev) =>
                    prev.filter((m) => (m.imdbId ?? m.id) !== key),
                  );

                  const params = new URLSearchParams();
                  if (movie.imdbId) params.set("imdbId", movie.imdbId);
                  if (!movie.imdbId) params.set("movieId", String(movie.id));

                  startTransition(async () => {
                    const res = await fetch(`/api/history?${params.toString()}`, {
                      method: "DELETE",
                    });

                    if (!res.ok) {
                      setVisibleMovies((prev) => [movie, ...prev]);
                    }
                  });
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <PlaylistPickerModal
        open={pickerOpen}
        movie={pickerMovie}
        onClose={() => {
          setPickerOpen(false);
          setPickerMovie(null);
        }}
        onAdded={() => {
          if (!pickerMovie) return;
          const toggleId = pickerMovie.imdbId ?? pickerMovie.id;
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.add(toggleId);
            return next;
          });
        }}
      />
    </section>
  );
}
