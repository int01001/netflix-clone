'use client';

import { PlayIcon, PlusIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import PlaylistPickerModal from "./PlaylistPickerModal";
import type { Movie, User } from "@/lib/types";

type Props = {
  movie: Movie;
  user: User | null;
  isFavorite?: boolean;
  onPlay?: () => void;
};

export default function Hero({ movie, user, isFavorite, onPlay }: Props) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(isFavorite ?? false);
  const [pending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const fallbackImage =
    "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1600&q=80";
  const heroImage =
    movie.backdropUrl && movie.backdropUrl !== "N/A"
      ? movie.backdropUrl
      : movie.thumbnailUrl && movie.thumbnailUrl !== "N/A"
        ? movie.thumbnailUrl
        : fallbackImage;

  const toggleFavorite = () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (favorite) {
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

        if (res.ok) setFavorite(false);
      });
      return;
    }

    setPickerOpen(true);
  };

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const setParallax = (clientX: number, clientY: number) => {
      const rect = node.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width - 0.5) * 24;
      const y = ((clientY - rect.top) / rect.height - 0.5) * 24;
      node.style.setProperty("--hero-x", `${x.toFixed(2)}px`);
      node.style.setProperty("--hero-y", `${y.toFixed(2)}px`);
    };

    const handleMouseMove = (event: MouseEvent) => setParallax(event.clientX, event.clientY);
    const handleTouchMove = (event: TouchEvent) => {
      if (!event.touches[0]) return;
      setParallax(event.touches[0].clientX, event.touches[0].clientY);
    };
    const handleScroll = () => {
      node.style.setProperty("--hero-scroll", `${window.scrollY.toFixed(2)}px`);
    };

    const resetPointer = () => {
      node.style.setProperty("--hero-x", "0px");
      node.style.setProperty("--hero-y", "0px");
    };

    handleScroll();
    node.addEventListener("mousemove", handleMouseMove, { passive: true });
    node.addEventListener("mouseleave", resetPointer);
    node.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      node.removeEventListener("mousemove", handleMouseMove);
      node.removeEventListener("mouseleave", resetPointer);
      node.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <section ref={sectionRef} className="hero-parallax relative min-h-[62vh] overflow-hidden md:min-h-[70vh]">
      <Image
        src={heroImage.startsWith("http") ? heroImage : fallbackImage}
        alt={movie.title}
        fill
        priority
        className="hero-media object-cover"
      />
      <div className="hero-ambient absolute inset-0" />
      <div className="hero-vignette absolute inset-0" />

      <div className="relative flex min-h-[62vh] items-end md:min-h-[70vh]">
        <div className="netflix-row-pad w-full pb-12 md:pb-20">
          <div className="hero-panel p-6 md:p-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
              Featured
            </p>

            <h1 className="text-4xl font-black leading-[0.95] text-white drop-shadow-[0_6px_20px_rgba(0,0,0,0.6)] md:text-6xl">
              {movie.title}
            </h1>

            <p className="mt-4 line-clamp-3 text-base text-[var(--muted)] md:text-lg">
              {movie.tagline ?? movie.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/85">
              {movie.year && <span>{movie.year}</span>}
              {movie.durationMinutes && <span>{movie.durationMinutes}m</span>}
              {movie.genre && <span>{movie.genre}</span>}
              {movie.rating && <span>IMDb {movie.rating}</span>}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="nf-btn nf-btn-primary" onClick={() => onPlay?.()}>
                <PlayIcon className="h-5 w-5" />
                Play trailer
              </button>

              <button
                onClick={toggleFavorite}
                disabled={pending}
                className="nf-btn nf-btn-secondary"
              >
                <PlusIcon className="h-5 w-5" />
                {favorite ? "In My List" : "Add to Playlist"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <PlaylistPickerModal
        open={pickerOpen}
        movie={pickerOpen ? movie : null}
        onClose={() => setPickerOpen(false)}
        onAdded={() => setFavorite(true)}
      />
    </section>
  );
}
