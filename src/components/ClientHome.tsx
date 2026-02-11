'use client';

import { useState } from "react";
import Hero from "./Hero";
import Navbar from "./Navbar";
import Row from "./Row";
import TrailerModal from "./TrailerModal";
import GenreFilter from "./GenreFilter";
import type { HomeSections, Movie, User } from "@/lib/types";

type Props = {
  sections: HomeSections;
  user: User | null;
};

export default function ClientHome({ sections, user }: Props) {
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
  const [genre, setGenre] = useState<string>("All");

  const openMovie = (movie: Movie) => setActiveMovie(movie);
  const closeMovie = () => setActiveMovie(null);

  const allMovies = useMemo(() => {
    const list = [
      sections.featured,
      ...sections.trending,
      ...sections.newReleases,
      ...sections.sciFi,
      ...sections.drama,
      ...(sections.favorites ?? []),
    ].filter(Boolean) as Movie[];

    const seen = new Set<string | number>();
    return list.filter((m) => {
      const key = m.imdbId ?? m.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [sections]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    allMovies.forEach((m) => {
      if (m.genre) set.add(m.genre);
    });
    return Array.from(set).sort();
  }, [allMovies]);

  const filtered = useMemo(() => {
    if (genre === "All") return allMovies.slice(0, 18);
    return allMovies.filter(
      (m) => (m.genre ?? "").toLowerCase() === genre.toLowerCase(),
    );
  }, [allMovies, genre]);

  return (
    <>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-6 md:px-6 md:py-10">
        <Navbar user={user} onSelectMovie={openMovie} />
        {sections.featured && (
          <Hero
            movie={sections.featured}
            user={user}
            isFavorite={sections.favorites?.some(
              (favorite) =>
                favorite.imdbId
                  ? favorite.imdbId === sections.featured?.imdbId
                  : favorite.id === sections.featured?.id,
            )}
            onPlay={() => openMovie(sections.featured!)}
          />
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">Browse by genre</h2>
            {genres.length > 0 && (
              <span className="text-xs text-slate-300">
                {genre === "All" ? "All genres" : genre}
              </span>
            )}
          </div>
          <GenreFilter genres={genres} value={genre} onChange={setGenre} />
          {filtered.length > 0 ? (
            <Row
              title={genre === "All" ? "Highlights" : `${genre} picks`}
              movies={filtered}
              favorites={sections.favorites}
              user={user}
              onPlay={openMovie}
            />
          ) : (
            <p className="text-sm text-slate-300">No movies in this genre yet.</p>
          )}
        </div>

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
