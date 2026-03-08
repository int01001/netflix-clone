'use client';

import { HeartIcon, PlayIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import type { Movie } from "@/lib/types";

type Props = {
  movie: Movie;
  isFavorite?: boolean;
  onFavorite?: (movie: Movie) => void;
  onPlay?: (movie: Movie) => void;
};

export default function MovieCard({ movie, isFavorite, onFavorite, onPlay }: Props) {
  const fallbackImage =
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80";

  const imageUrl =
    movie.thumbnailUrl && movie.thumbnailUrl !== "N/A"
      ? movie.thumbnailUrl
      : movie.backdropUrl && movie.backdropUrl !== "N/A"
        ? movie.backdropUrl
        : fallbackImage;

  const finalImage = imageUrl.startsWith("http") ? imageUrl : fallbackImage;

  return (
    <article
      className="netflix-card group relative cursor-pointer"
      onClick={() => onPlay?.(movie)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPlay?.(movie);
        }
      }}
    >
      <div className="relative aspect-video">
        <Image src={finalImage} alt={movie.title} fill sizes="(max-width: 768px) 80vw, 320px" className="object-cover" />
        <div className="netflix-card-overlay absolute inset-0" />

        <button
          onClick={(event) => {
            event.stopPropagation();
            onFavorite?.(movie);
          }}
          className="absolute right-2 top-2 rounded-full bg-black/75 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
          aria-label="Toggle favorite"
        >
          <HeartIcon className={`h-5 w-5 ${isFavorite ? "text-[#e50914]" : "text-white"}`} />
        </button>

        <div className="absolute left-2 top-2 rounded-full bg-black/65 p-1.5 text-white opacity-0 transition group-hover:opacity-100">
          <PlayIcon className="h-4 w-4" />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-1 text-[1.03rem] font-semibold text-white">{movie.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[var(--muted)]">
            {movie.year && <span>{movie.year}</span>}
            {movie.genre && <span>{movie.genre}</span>}
            {movie.rating && <span>IMDb {movie.rating}</span>}
          </div>
        </div>
      </div>
    </article>
  );
}
