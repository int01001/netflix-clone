'use client';

import { XMarkIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Movie } from "@/lib/types";

type Playlist = {
  id: number;
  name: string;
};

type Props = {
  open: boolean;
  movie: Movie | null;
  onClose: () => void;
  onAdded?: (playlistId: number) => void;
};

export default function PlaylistPickerModal({ open, movie, onClose, onAdded }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canShow = open && !!movie;

  const moviePayload = useMemo(() => {
    if (!movie) return null;
    return {
      movieId: movie.imdbId ? null : movie.id,
      imdbId: movie.imdbId ?? null,
    };
  }, [movie]);

  useEffect(() => {
    if (!canShow) return;

    let active = true;
    setLoading(true);
    setError(null);

    fetch("/api/playlists", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load playlists");
        return (await res.json()) as { playlists?: Playlist[] };
      })
      .then((data) => {
        if (!active) return;
        setPlaylists(Array.isArray(data.playlists) ? data.playlists : []);
      })
      .catch((e) => {
        if (!active) return;
        setPlaylists([]);
        setError(e?.message ?? "Unable to load playlists");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canShow]);

  const addToPlaylist = (playlistId: number) => {
    if (!moviePayload) return;
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/playlists/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, ...moviePayload }),
      });

      if (!res.ok) {
        setError("Unable to add to playlist");
        return;
      }

      onAdded?.(playlistId);
      onClose();
    });
  };

  const createPlaylist = () => {
    const name = newName.trim();
    if (!name) return;

    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        setError("Unable to create playlist (name may already exist)");
        return;
      }

      const data = (await res.json()) as { playlists?: Playlist[] };
      const next = Array.isArray(data.playlists) ? data.playlists : [];
      setPlaylists(next);
      setNewName("");

      const created = next.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (created) {
        addToPlaylist(created.id);
      }
    });
  };

  return (
    <AnimatePresence>
      {canShow && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-[#121215] shadow-2xl"
            initial={{ scale: 0.98, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-white/60">Add to playlist</p>
                <h3 className="mt-1 line-clamp-1 text-lg font-semibold text-white">
                  {movie?.title}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-black/60 p-2 text-white/80 transition hover:bg-black"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-white/85">Choose a playlist</p>

                {loading ? (
                  <p className="text-sm text-[var(--muted)]">Loading playlists...</p>
                ) : playlists.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No playlists found.</p>
                ) : (
                  <div className="grid gap-2">
                    {playlists.map((p) => (
                      <button
                        key={p.id}
                        disabled={pending}
                        onClick={() => addToPlaylist(p.id)}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/90 transition hover:border-white/20 hover:bg-white/[0.06]"
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-white/50">Add</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-white/10" />

              <div className="space-y-2">
                <p className="text-sm font-semibold text-white/85">Create new playlist</p>
                <div className="flex gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Weekend Movies"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
                  />
                  <button
                    onClick={createPlaylist}
                    disabled={pending || !newName.trim()}
                    className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/20 hover:bg-white/[0.1] disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
