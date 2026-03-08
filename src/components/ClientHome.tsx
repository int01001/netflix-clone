'use client';

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Hero from "./Hero";
import Navbar from "./Navbar";
import Row from "./Row";
import TrailerModal from "./TrailerModal";
import GenreFilter from "./GenreFilter";
import InfiniteRows from "./InfiniteRows";
import type { HomeSections, Movie, User } from "@/lib/types";

type Props = {
  sections: HomeSections;
  user: User | null;
};

export default function ClientHome({ sections, user }: Props) {
  const router = useRouter();
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
  const [genre, setGenre] = useState<string>("All");
  const [genreMovies, setGenreMovies] = useState<Movie[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const genreMode = genre !== "All";

  const openMovie = (movie: Movie) => {
    if (!user) {
      router.push("/signup");
      return;
    }
    setActiveMovie(movie);
  };
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
    return list.filter((movie) => {
      const key = movie.imdbId ?? movie.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [sections]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    allMovies.forEach((movie) => {
      if (movie.genre) set.add(movie.genre);
    });
    return Array.from(set).sort();
  }, [allMovies]);

  useEffect(() => {
    let active = true;

    const loadGenreMovies = async () => {
      if (genre === "All") {
        setGenreMovies([]);
        setGenreLoading(false);
        return;
      }

      setGenreLoading(true);
      try {
        const pages = [1, 2, 3, 4, 5, 6];
        const responses = await Promise.all(
          pages.map(async (page) => {
            const res = await fetch(`/api/search?genre=${encodeURIComponent(genre)}&page=${page}`, {
              cache: "no-store",
            });
            if (!res.ok) return { results: [] as Movie[] };
            return (await res.json()) as { results?: Movie[] };
          }),
        );

        if (!active) return;

        const list = responses.flatMap((response) => response.results ?? []);
        const seen = new Set<string | number>();
        const deduped = list.filter((movie) => {
          const key = movie.imdbId ?? movie.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setGenreMovies(deduped);
      } catch (error) {
        if (!active) return;
        console.error("Genre movie fetch failed", error);
        setGenreMovies([]);
      } finally {
        if (active) setGenreLoading(false);
      }
    };

    loadGenreMovies();

    return () => {
      active = false;
    };
  }, [genre]);

  const filtered = useMemo(() => {
    if (!genreMode) return allMovies.slice(0, 24);

    const exactFromApi = genreMovies.filter(
      (movie) => (movie.genre ?? "").toLowerCase() === genre.toLowerCase(),
    );
    if (exactFromApi.length) return exactFromApi;

    return allMovies.filter((movie) => (movie.genre ?? "").toLowerCase() === genre.toLowerCase());
  }, [allMovies, genre, genreMode, genreMovies]);

  return (
    <>
      <div className="netflix-page">
        <Navbar user={user} onSelectMovie={openMovie} />

        {!genreMode && sections.featured && (
          <Hero
            movie={sections.featured}
            user={user}
            isFavorite={sections.favorites?.some((favorite) => {
              if (favorite.imdbId) return favorite.imdbId === sections.featured?.imdbId;
              return favorite.id === sections.featured?.id;
            })}
            onPlay={() => openMovie(sections.featured!)}
          />
        )}

        <main className="space-y-10 pt-6 md:pt-8">
          <section className="netflix-row-pad space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="netflix-headline">Browse by genre</h2>
              {genres.length > 0 && (
                <span className="text-sm text-[var(--muted)]">
                  {genre === "All" ? "All genres" : genre}
                </span>
              )}
            </div>

            <GenreFilter genres={genres} value={genre} onChange={setGenre} />

            {genre !== "All" && genreLoading && (
              <p className="text-sm text-[var(--muted)]">Loading {genre} titles...</p>
            )}

            {filtered.length > 0 ? (
              <Row
                title={genre === "All" ? "Highlights" : `${genre} picks`}
                movies={filtered}
                favorites={sections.favorites}
                user={user}
                onPlay={openMovie}
                layout={genreMode ? "grid" : "carousel"}
              />
            ) : (
              <p className="text-sm text-[var(--muted)]">No movies in this genre yet.</p>
            )}
          </section>

          {!genreMode && (
            <section className="netflix-row-pad space-y-10">
              {user && sections.continueWatching && sections.continueWatching.length > 0 && (
                <Row
                  title="Continue Where You Left Off"
                  movies={sections.continueWatching}
                  favorites={sections.favorites}
                  user={user}
                  onPlay={openMovie}
                  allowRemove
                />
              )}

              <Row
                title="Trending Now"
                movies={sections.trending}
                favorites={sections.favorites}
                user={user}
                anchorId="series"
                onPlay={openMovie}
              />

              <Row
                title="New & Popular"
                movies={sections.newReleases}
                favorites={sections.favorites}
                user={user}
                anchorId="new"
                onPlay={openMovie}
              />

              <Row
                title="Sci-Fi Worlds"
                movies={sections.sciFi}
                favorites={sections.favorites}
                user={user}
                anchorId="movies"
                onPlay={openMovie}
              />

              <Row
                title="Dramas You May Like"
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

              <InfiniteRows favorites={sections.favorites} onPlay={openMovie} />
            </section>
          )}
        </main>
      </div>

      <TrailerModal movie={activeMovie} onClose={closeMovie} />
    </>
  );
}
