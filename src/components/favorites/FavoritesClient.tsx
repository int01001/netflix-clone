'use client';

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import TrailerModal from "@/components/TrailerModal";
import type { Movie, User } from "@/lib/types";

type Props = {
  favorites: Movie[];
  user: User;
};

export default function FavoritesClient({ favorites, user }: Props) {
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
  const [playlists, setPlaylists] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [playlistMovies, setPlaylistMovies] = useState<Movie[]>(favorites);
  const [loading, setLoading] = useState(false);

  const selected = useMemo(
    () => playlists.find((p) => p.id === selectedPlaylistId) ?? null,
    [playlists, selectedPlaylistId],
  );

  const handleDeletePlaylist = async (playlistId: number) => {
    if (!confirm("Delete this playlist? This cannot be undone.")) return;

    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
    }

    const res = await fetch(`/api/playlists/${playlistId}`, { method: "DELETE" });
    if (!res.ok) {
      // Revert on failure
      setPlaylists((prev) => [...prev]);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch("/api/playlists", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load playlists");
        return (await res.json()) as { playlists?: Array<{ id: number; name: string }> };
      })
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data.playlists) ? data.playlists : [];
        setPlaylists(list);

        const myList = list.find((p) => p.name === "My List");
        setSelectedPlaylistId((prev) => prev ?? myList?.id ?? list[0]?.id ?? null);
      })
      .catch(() => {
        if (!active) return;
        setPlaylists([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!selectedPlaylistId) {
      setPlaylistMovies([]);
      return;
    }

    setLoading(true);

    fetch(`/api/playlists/items?playlistId=${selectedPlaylistId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load playlist");
        return (await res.json()) as {
          items?: Array<{ id: number; imdb_id: string | null; movie_id: number | null }>;
        };
      })
      .then(async (data) => {
        const items = Array.isArray(data.items) ? data.items : [];
        const ids = items
          .map((item) => item.imdb_id)
          .filter((id): id is string => !!id);

        if (!items.length) {
          if (!active) return;
          setPlaylistMovies([]);
          return;
        }

        const res = await fetch(
          `/api/resolve-movies?imdbIds=${encodeURIComponent(ids.join(","))}`,
          { cache: "no-store" },
        );

        if (!res.ok) throw new Error("Unable to resolve playlist movies");
        const payload = (await res.json()) as { movies?: Movie[] };
        const movies = Array.isArray(payload.movies) ? payload.movies : [];

        if (!active) return;

        const byId = new Map(movies.map((m) => [m.imdbId ?? "", m]));
        const ordered = items
          .map((item) => (item.imdb_id ? byId.get(item.imdb_id) ?? null : null))
          .filter((m): m is Movie => !!m);

        setPlaylistMovies(ordered);
      })
      .catch(() => {
        if (!active) return;
        setPlaylistMovies([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedPlaylistId]);

  const handleToggleInSelectedPlaylist = async (movie: Movie) => {
    if (!selectedPlaylistId) return;

    const key = movie.imdbId ?? movie.id;

    setPlaylistMovies((prev) => prev.filter((m) => (m.imdbId ?? m.id) !== key));

    const res = await fetch("/api/playlists/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playlistId: selectedPlaylistId,
        movieId: movie.imdbId ? null : movie.id,
        imdbId: movie.imdbId ?? null,
      }),
    });

    if (!res.ok) {
      setPlaylistMovies((prev) => [movie, ...prev]);
    }
  };

  return (
    <div className="app-shell">
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 md:px-6 md:py-10">
        <Navbar user={user} onSelectMovie={setActiveMovie} />
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Playlists</h1>
          <p className="text-sm text-slate-300">
            {playlistMovies.length} title{playlistMovies.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {playlists.map((playlist) => {
            const active = playlist.id === selectedPlaylistId;
            const isEmpty = playlistMovies.length === 0 && active;
            return (
              <div key={playlist.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedPlaylistId(playlist.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-[#e50914]/70 bg-[#e50914]/15 text-white"
                      : "border-white/15 bg-white/[0.03] text-white/70 hover:border-white/25"
                  }`}
                >
                  {playlist.name}
                </button>
                {isEmpty && playlist.name !== "My List" && (
                  <button
                    onClick={() => handleDeletePlaylist(playlist.id)}
                    className="rounded-full border border-red-500/30 bg-red-500/10 p-1 text-xs text-red-400 transition hover:border-red-500/50 hover:bg-red-500/20"
                    aria-label="Delete playlist"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {loading ? (
          <p className="text-slate-300">Loading...</p>
        ) : selectedPlaylistId == null ? (
          <p className="text-slate-300">No playlists yet. Add one from the home page.</p>
        ) : playlistMovies.length === 0 ? (
          <p className="text-slate-300">
            {selected ? `No movies in ${selected.name} yet.` : "No movies yet."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {playlistMovies.map((movie) => (
              <MovieCard
                key={movie.imdbId ?? movie.slug}
                movie={movie}
                isFavorite
                onFavorite={handleToggleInSelectedPlaylist}
                onPlay={setActiveMovie}
              />
            ))}
          </div>
        )}
      </div>
      <TrailerModal movie={activeMovie} onClose={() => setActiveMovie(null)} />
    </div>
  );
}
