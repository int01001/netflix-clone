'use client';

import { useState } from "react";
import Hero from "./Hero";
import Navbar from "./Navbar";
import Row from "./Row";
import TrailerModal from "./TrailerModal";
import type { HomeSections, Movie, User } from "@/lib/types";

type Props = {
  sections: HomeSections;
  user: User | null;
};

export default function ClientHome({ sections, user }: Props) {
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);

  const openMovie = (movie: Movie) => setActiveMovie(movie);
  const closeMovie = () => setActiveMovie(null);

  return (
    <>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-6 md:px-6 md:py-10">
        <Navbar user={user} onSelectMovie={openMovie} />
        {sections.featured && (
          <Hero
            movie={sections.featured}
            user={user}
            isFavorite={sections.favorites?.some(
              (favorite) => favorite.tmdbId === sections.featured?.tmdbId,
            )}
            onPlay={() => openMovie(sections.featured!)}
          />
        )}

        <div className="space-y-8">
          <Row
            title="Trending now"
            movies={sections.trending}
            favorites={sections.favorites}
            user={user}
            anchorId="series"
            onPlay={openMovie}
          />
          <Row
            title="New & popular"
            movies={sections.newReleases}
            favorites={sections.favorites}
            user={user}
            anchorId="new"
            onPlay={openMovie}
          />
          <Row
            title="Sci-Fi worlds"
            movies={sections.sciFi}
            favorites={sections.favorites}
            user={user}
            anchorId="movies"
            onPlay={openMovie}
          />
          <Row
            title="Dramas that linger"
            movies={sections.drama}
            favorites={sections.favorites}
            user={user}
            onPlay={openMovie}
          />
          {sections.favorites && sections.favorites.length > 0 && (
            <Row
              title="My List"
              movies={sections.favorites}
              favorites={sections.favorites}
              user={user}
              onPlay={openMovie}
            />
          )}
        </div>
      </div>

      <TrailerModal movie={activeMovie} onClose={closeMovie} />
    </>
  );
}
