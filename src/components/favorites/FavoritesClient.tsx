'use client';

import { useState } from "react";
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

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(229,9,20,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_35%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/60 to-[#05060a]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 md:px-6 md:py-10">
        <Navbar user={user} onSelectMovie={setActiveMovie} />
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My List</h1>
          <p className="text-sm text-slate-300">
            {favorites.length} title{favorites.length === 1 ? "" : "s"}
          </p>
        </div>
        {favorites.length === 0 ? (
          <p className="text-slate-300">No favorites yet. Add some from the home page.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {favorites.map((movie) => (
              <MovieCard
                key={movie.slug}
                movie={movie}
                isFavorite
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
