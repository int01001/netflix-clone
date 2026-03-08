export type User = {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type Movie = {
  id: number;
  imdbId?: string | null;
  tmdbId?: number | null;
  slug: string;
  title: string;
  tagline: string | null;
  genre: string | null;
  year: number | null;
  durationMinutes: number | null;
  rating: number | null;
  description: string | null;
  backdropUrl: string | null;
  thumbnailUrl: string | null;
  trailerUrl: string | null;
  progressSeconds?: number | null;
  durationSeconds?: number | null;
  featured: boolean;
};

export type HomeSections = {
  featured: Movie | null;
  trending: Movie[];
  newReleases: Movie[];
  sciFi: Movie[];
  drama: Movie[];
  continueWatching?: Movie[];
  favorites?: Movie[];
};
