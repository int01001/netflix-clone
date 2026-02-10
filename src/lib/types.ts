export type User = {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type Movie = {
  id: number;
  tmdbId?: number | null;
  imdbId?: string | null;
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
  featured: boolean;
};

export type HomeSections = {
  featured: Movie | null;
  trending: Movie[];
  newReleases: Movie[];
  sciFi: Movie[];
  drama: Movie[];
  favorites?: Movie[];
};
