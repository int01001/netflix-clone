import { NextRequest, NextResponse } from "next/server";
import { getTmdbMoviesByGenre, searchTmdbMovies } from "@/lib/tmdb";
import type { Movie } from "@/lib/types";

export const dynamic = "force-dynamic";

type MoodKey =
  | "happy"
  | "sad"
  | "stressed"
  | "romantic"
  | "bored"
  | "excited"
  | "chill"
  | "angry"
  | "nostalgic"
  | "curious";

type MoodProfile = {
  label: string;
  keywords: string[];
  genres: string[];
  queries: string[];
  reply: string;
};

type ChatHistoryItem = {
  role?: string;
  text?: string;
};

type RequestBody = {
  mood?: string;
  message?: string;
  history?: ChatHistoryItem[];
};

type ParsedIntent = {
  mood: MoodKey;
  moodLabel: string;
  preferredGenres: string[];
  excludedGenres: string[];
  queries: string[];
  flags: {
    wantsRecent: boolean;
    wantsClassic: boolean;
    wantsTopRated: boolean;
    wantsFamily: boolean;
    wantsLight: boolean;
    wantsDark: boolean;
  };
};

const MOOD_PROFILES: Record<MoodKey, MoodProfile> = {
  happy: {
    label: "Happy",
    keywords: ["happy", "joy", "cheerful", "good mood", "fun", "celebrate"],
    genres: ["Comedy", "Adventure", "Animation"],
    queries: ["feel good movie", "uplifting comedy", "fun adventure movie"],
    reply: "Great vibe. I picked feel-good and high-energy titles for you.",
  },
  sad: {
    label: "Sad",
    keywords: ["sad", "low", "down", "heartbroken", "cry", "lonely"],
    genres: ["Drama", "Romance", "Animation"],
    queries: ["comfort movie", "heartwarming movie", "emotional drama"],
    reply: "I focused on comforting and emotional stories.",
  },
  stressed: {
    label: "Stressed",
    keywords: ["stressed", "anxious", "overwhelmed", "burnout", "pressure"],
    genres: ["Comedy", "Fantasy", "Adventure"],
    queries: ["light comedy movie", "easy watch movie", "relaxing movie"],
    reply: "I prioritized easy-to-watch picks to help you decompress.",
  },
  romantic: {
    label: "Romantic",
    keywords: ["romantic", "love", "date", "couple", "valentine"],
    genres: ["Romance", "Drama", "Comedy"],
    queries: ["romantic movie", "date night movie", "love story movie"],
    reply: "I selected date-night and romance-first recommendations.",
  },
  bored: {
    label: "Bored",
    keywords: ["bored", "nothing to watch", "meh", "blank", "dull"],
    genres: ["Action", "Thriller", "Sci-Fi"],
    queries: ["must watch thriller", "mind blowing movie", "gripping movie"],
    reply: "I went with gripping titles to pull you in quickly.",
  },
  excited: {
    label: "Excited",
    keywords: ["excited", "hyped", "adrenaline", "energetic", "pumped"],
    genres: ["Action", "Adventure", "Sci-Fi"],
    queries: ["high energy movie", "epic blockbuster", "action-packed movie"],
    reply: "I chose fast-paced picks that match your energy.",
  },
  chill: {
    label: "Chill",
    keywords: ["chill", "calm", "peaceful", "relax", "easy"],
    genres: ["Drama", "Mystery", "Fantasy"],
    queries: ["slow burn movie", "atmospheric movie", "cozy movie"],
    reply: "I curated smooth, low-stress options for a chill watch.",
  },
  angry: {
    label: "Angry",
    keywords: ["angry", "frustrated", "mad", "annoyed", "furious"],
    genres: ["Action", "Thriller", "Crime"],
    queries: ["revenge thriller", "intense action movie", "crime thriller"],
    reply: "I picked intense titles to channel that energy.",
  },
  nostalgic: {
    label: "Nostalgic",
    keywords: ["nostalgic", "old school", "throwback", "retro", "classic"],
    genres: ["Drama", "Adventure", "Romance"],
    queries: ["classic movie", "old school favorite", "retro cinema"],
    reply: "I leaned toward timeless and nostalgia-friendly picks.",
  },
  curious: {
    label: "Curious",
    keywords: ["curious", "mind bending", "twist", "mystery", "smart"],
    genres: ["Sci-Fi", "Mystery", "Thriller"],
    queries: ["mind bending sci fi", "twist ending movie", "mystery thriller"],
    reply: "I prioritized smart, twisty recommendations.",
  },
};

const MOOD_VALUES = Object.keys(MOOD_PROFILES) as MoodKey[];

const GENRE_ALIASES: Record<string, string[]> = {
  Action: ["action", "fight", "combat", "adrenaline", "fast paced", "fast-paced"],
  Adventure: ["adventure", "journey", "quest", "epic"],
  Animation: ["animation", "animated", "cartoon", "family", "kids", "children"],
  Comedy: ["comedy", "funny", "laugh", "light", "feel good", "feel-good"],
  Crime: ["crime", "gangster", "mafia", "heist", "detective"],
  Drama: ["drama", "emotional", "character driven", "character-driven"],
  Fantasy: ["fantasy", "magic", "myth", "mythical"],
  Horror: ["horror", "scary", "creepy", "haunted", "ghost", "slasher"],
  Mystery: ["mystery", "whodunit", "detective", "twist", "puzzle"],
  Romance: ["romance", "romantic", "love story", "love-story", "date night"],
  "Sci-Fi": ["sci fi", "sci-fi", "science fiction", "space", "future", "cyberpunk"],
  Thriller: ["thriller", "suspense", "tense", "intense", "psychological"],
};

const STOPWORDS = new Set([
  "i",
  "am",
  "im",
  "feeling",
  "feel",
  "movie",
  "movies",
  "watch",
  "something",
  "want",
  "wanna",
  "me",
  "please",
  "recommend",
  "recommendation",
  "show",
  "give",
  "need",
]);

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const uniqueMovies = (movies: Movie[]): Movie[] => {
  const seen = new Set<string | number>();
  return movies.filter((movie) => {
    const key = movie.imdbId ?? movie.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeMood = (value: unknown): MoodKey | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().trim();
  return MOOD_VALUES.includes(normalized as MoodKey)
    ? (normalized as MoodKey)
    : null;
};

const textIncludes = (text: string, phrase: string) =>
  text.includes(phrase) || text.includes(phrase.replace("-", " "));

const scoreMood = (text: string): MoodKey => {
  const scores = new Map<MoodKey, number>();

  for (const mood of MOOD_VALUES) {
    let score = 0;
    for (const keyword of MOOD_PROFILES[mood].keywords) {
      if (textIncludes(text, keyword)) score += 2;
    }
    scores.set(mood, score);
  }

  const winner = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!winner || winner[1] === 0) return "chill";
  return winner[0];
};

const parseGenres = (text: string) => {
  const preferred: string[] = [];
  const excluded: string[] = [];

  for (const [genre, aliases] of Object.entries(GENRE_ALIASES)) {
    for (const alias of aliases) {
      if (!textIncludes(text, alias)) continue;
      preferred.push(genre);

      if (
        textIncludes(text, `no ${alias}`) ||
        textIncludes(text, `not ${alias}`) ||
        textIncludes(text, `without ${alias}`) ||
        textIncludes(text, `avoid ${alias}`)
      ) {
        excluded.push(genre);
      }
    }
  }

  return {
    preferredGenres: unique(preferred),
    excludedGenres: unique(excluded),
  };
};

const parseFlags = (text: string) => ({
  wantsRecent:
    textIncludes(text, "latest") ||
    textIncludes(text, "recent") ||
    textIncludes(text, "new release") ||
    textIncludes(text, "new"),
  wantsClassic:
    textIncludes(text, "classic") ||
    textIncludes(text, "old school") ||
    textIncludes(text, "retro"),
  wantsTopRated:
    textIncludes(text, "best") ||
    textIncludes(text, "top rated") ||
    textIncludes(text, "high rated") ||
    textIncludes(text, "critically acclaimed"),
  wantsFamily:
    textIncludes(text, "family") ||
    textIncludes(text, "kids") ||
    textIncludes(text, "children"),
  wantsLight:
    textIncludes(text, "light") ||
    textIncludes(text, "feel good") ||
    textIncludes(text, "comfort"),
  wantsDark:
    textIncludes(text, "dark") ||
    textIncludes(text, "gritty") ||
    textIncludes(text, "intense"),
});

const compactMessageToQuery = (text: string): string => {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !STOPWORDS.has(token));
  return tokens.slice(0, 6).join(" ").trim();
};

const parseLikeQuery = (text: string): string | null => {
  const likeMatch = /(?:like|similar to|such as)\s+([a-z0-9:,'\-\s]{2,60})/i.exec(text);
  if (!likeMatch) return null;
  return likeMatch[1].trim();
};

const buildIntent = (body: RequestBody): ParsedIntent => {
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const historyText = Array.isArray(body.history)
    ? body.history
        .filter((item) => item?.role === "user" && typeof item?.text === "string")
        .slice(-4)
        .map((item) => item.text!.trim())
        .join(" ")
    : "";
  const combined = `${historyText} ${message}`.trim().toLowerCase();

  const forcedMood = normalizeMood(body.mood);
  const mood = forcedMood ?? scoreMood(combined);
  const profile = MOOD_PROFILES[mood];
  const { preferredGenres: explicitGenres, excludedGenres } = parseGenres(combined);
  const flags = parseFlags(combined);
  const likeQuery = parseLikeQuery(combined);

  const preferredGenres = unique([
    ...explicitGenres,
    ...profile.genres,
    ...(flags.wantsFamily ? ["Animation", "Comedy", "Adventure"] : []),
    ...(flags.wantsDark ? ["Thriller", "Mystery", "Drama"] : []),
  ]).filter((genre) => !excludedGenres.includes(genre));

  const compactQuery = compactMessageToQuery(combined);
  const queries = unique([
    ...profile.queries,
    ...(compactQuery ? [compactQuery] : []),
    ...(likeQuery ? [likeQuery] : []),
    ...(flags.wantsTopRated ? ["top rated movie"] : []),
    ...(flags.wantsRecent ? ["new movie"] : []),
  ]).slice(0, 8);

  return {
    mood,
    moodLabel: profile.label,
    preferredGenres,
    excludedGenres,
    queries,
    flags,
  };
};

const scoreMovie = (movie: Movie, intent: ParsedIntent): number => {
  const genre = (movie.genre ?? "").toLowerCase();
  const year = movie.year ?? 0;
  const rating = movie.rating ?? 0;

  let score = rating * 1.1;

  for (const preferred of intent.preferredGenres) {
    if (genre.includes(preferred.toLowerCase())) score += 3.4;
  }

  for (const excluded of intent.excludedGenres) {
    if (genre.includes(excluded.toLowerCase())) score -= 7;
  }

  if (intent.flags.wantsRecent) score += year >= 2020 ? 3 : 0;
  if (intent.flags.wantsClassic) score += year > 0 && year <= 2010 ? 3 : 0;
  if (intent.flags.wantsTopRated) score += rating >= 7.5 ? 2.5 : 0;
  if (intent.flags.wantsFamily && genre.includes("horror")) score -= 5;
  if (intent.flags.wantsLight && genre.includes("horror")) score -= 4;
  if (intent.flags.wantsDark && genre.includes("comedy")) score -= 2;

  if (!movie.backdropUrl && !movie.thumbnailUrl) score -= 3;

  return score;
};

const buildReply = (intent: ParsedIntent, count: number) => {
  const profile = MOOD_PROFILES[intent.mood];
  const genresPart = intent.preferredGenres.slice(0, 3).join(", ");
  const qualifiers: string[] = [];
  if (intent.flags.wantsRecent) qualifiers.push("recent releases");
  if (intent.flags.wantsTopRated) qualifiers.push("top-rated picks");
  if (intent.flags.wantsClassic) qualifiers.push("classic titles");

  const qualifierPart = qualifiers.length ? ` and ${qualifiers.join(", ")}` : "";
  const genreSegment = genresPart ? ` (${genresPart}${qualifierPart})` : "";

  return `${profile.reply}${genreSegment}. Found ${count} recommendations.`;
};

async function getMoodRecommendations(intent: ParsedIntent): Promise<Movie[]> {
  const genreTasks = intent.preferredGenres
    .slice(0, 5)
    .flatMap((genre, index) => [
      getTmdbMoviesByGenre(genre, 1),
      ...(index < 2 ? [getTmdbMoviesByGenre(genre, 2)] : []),
    ]);

  const queryTasks = intent.queries
    .slice(0, 6)
    .map((query) => searchTmdbMovies(query, 1));

  const settled = await Promise.allSettled([...genreTasks, ...queryTasks]);
  const merged = settled
    .filter(
      (result): result is PromiseFulfilledResult<Movie[]> =>
        result.status === "fulfilled",
    )
    .flatMap((result) => result.value);

  const filtered = uniqueMovies(merged).filter((movie) => {
    const genre = (movie.genre ?? "").toLowerCase();
    return !intent.excludedGenres.some((excluded) =>
      genre.includes(excluded.toLowerCase()),
    );
  });

  return filtered
    .map((movie) => ({ movie, score: scoreMovie(movie, intent) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.movie)
    .slice(0, 14);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const intent = buildIntent(body);
    const movies = await getMoodRecommendations(intent);

    return NextResponse.json({
      mood: intent.mood,
      moodLabel: intent.moodLabel,
      reply: buildReply(intent, movies.length),
      movies,
    });
  } catch (error) {
    console.error("Mood recommendation failed", error);
    return NextResponse.json(
      {
        mood: "chill",
        moodLabel: "Chill",
        reply:
          "I couldn't fetch recommendations right now. Try another mood in a moment.",
        movies: [],
      },
      { status: 200 },
    );
  }
}
