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
    <div className="app-shell">
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
