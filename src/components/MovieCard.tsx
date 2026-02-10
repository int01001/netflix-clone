'use client';

import { HeartIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
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
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80";

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5"
      onClick={() => onPlay?.(movie)}
    >
      <div className="relative aspect-[16/9]">
        <Image
          src={movie.thumbnailUrl ?? movie.backdropUrl ?? fallbackImage}
          alt={movie.title}
          fill
          className="object-cover transition duration-300 group-hover:brightness-110"
          sizes="320px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite?.(movie);
          }}
          className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white opacity-0 transition group-hover:opacity-100"
          aria-label="Toggle favorite"
        >
          <HeartIcon
            className={`h-5 w-5 ${isFavorite ? "text-red-400" : "text-white"}`}
          />
        </button>
      </div>
      <div className="flex flex-col gap-1 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-white">
            {movie.title}
          </p>
          {movie.rating && (
            <span className="text-xs font-semibold text-amber-300">
              ★ {movie.rating}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-200/70">
          {movie.year && <span>{movie.year}</span>}
          {movie.genre && <span className="uppercase tracking-wide">{movie.genre}</span>}
          {movie.durationMinutes && <span>{movie.durationMinutes}m</span>}
        </div>
      </div>
    </motion.div>
  );
}
