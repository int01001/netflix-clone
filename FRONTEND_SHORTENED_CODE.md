# Shortened Frontend Code

This is a shortened but still clear version of the frontend side of the CineWave / Netflix clone. It focuses on page structure, state flow, user interactions, and important UI components while removing repeated styling classes and long markup details.

## Frontend Structure

```txt
src/app/
  layout.tsx              Global app layout
  globals.css             Tailwind and custom Netflix-style UI classes
  page.tsx                Home page server component
  loading.tsx             Loading UI
  (auth)/
    login/page.tsx
    signup/page.tsx
    forgot-password/page.tsx
  favorites/page.tsx
  profile/page.tsx

src/components/
  ClientHome.tsx          Main client-side home experience
  Navbar.tsx              Top navigation, search, logout, mobile menu
  Hero.tsx                Featured movie banner
  Row.tsx                 Movie carousel/grid row
  MovieCard.tsx           Individual movie tile
  SearchModal.tsx         Debounced movie search modal
  TrailerModal.tsx        In-app trailer player
  PlaylistPickerModal.tsx Playlist selection modal
  GenreFilter.tsx         Genre filter buttons
  InfiniteRows.tsx        Extra paginated rows
  MoodChatbot.tsx         Mood-based recommendation chat UI
  AuthForm.tsx            Basic login form
  SignupClient.tsx        OTP signup and profile setup
```

## Home Page

The home page is a server component. It loads the current user and movie sections, then passes them to the client-side home UI.

```tsx
// src/app/page.tsx
import ClientHome from "@/components/ClientHome";
import { getCurrentUser, getHomeSections } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const sections = await getHomeSections(user?.id);

  return (
    <div className="app-shell">
      <ClientHome sections={sections} user={user} />
    </div>
  );
}
```

## Main Client Home

`ClientHome` controls the interactive frontend state:

- opens trailer modal only for logged-in users
- builds a deduped movie list from all home sections
- extracts available genres
- fetches genre-specific titles from `/api/search`
- switches between normal rows and genre-filtered grid
- renders the mood chatbot

```tsx
// src/components/ClientHome.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Hero from "./Hero";
import Navbar from "./Navbar";
import Row from "./Row";
import TrailerModal from "./TrailerModal";
import GenreFilter from "./GenreFilter";
import InfiniteRows from "./InfiniteRows";
import MoodChatbot from "./MoodChatbot";
import type { HomeSections, Movie, User } from "@/lib/types";

type Props = {
  sections: HomeSections;
  user: User | null;
};

export default function ClientHome({ sections, user }: Props) {
  const router = useRouter();
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
  const [genre, setGenre] = useState("All");
  const [genreMovies, setGenreMovies] = useState<Movie[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);

  const openMovie = (movie: Movie) => {
    if (!user) {
      router.push("/signup");
      return;
    }
    setActiveMovie(movie);
  };

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
    return Array.from(
      new Set(allMovies.map((movie) => movie.genre).filter(Boolean) as string[]),
    ).sort();
  }, [allMovies]);

  useEffect(() => {
    let active = true;

    async function loadGenreMovies() {
      if (genre === "All") {
        setGenreMovies([]);
        setGenreLoading(false);
        return;
      }

      setGenreLoading(true);
      try {
        const responses = await Promise.all(
          [1, 2, 3, 4, 5, 6].map(async (page) => {
            const res = await fetch(`/api/search?genre=${encodeURIComponent(genre)}&page=${page}`);
            return res.ok ? res.json() : { results: [] };
          }),
        );

        if (!active) return;

        const seen = new Set<string | number>();
        const deduped = responses
          .flatMap((response) => response.results ?? [])
          .filter((movie: Movie) => {
            const key = movie.imdbId ?? movie.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

        setGenreMovies(deduped);
      } finally {
        if (active) setGenreLoading(false);
      }
    }

    loadGenreMovies();
    return () => {
      active = false;
    };
  }, [genre]);

  const filtered = useMemo(() => {
    if (genre === "All") return allMovies.slice(0, 24);

    const exact = genreMovies.filter(
      (movie) => (movie.genre ?? "").toLowerCase() === genre.toLowerCase(),
    );

    return exact.length
      ? exact
      : allMovies.filter((movie) => (movie.genre ?? "").toLowerCase() === genre.toLowerCase());
  }, [allMovies, genre, genreMovies]);

  return (
    <>
      <div className="netflix-page">
        <Navbar user={user} onSelectMovie={openMovie} />

        {genre === "All" && sections.featured && (
          <Hero
            movie={sections.featured}
            user={user}
            isFavorite={sections.favorites?.some(
              (favorite) => (favorite.imdbId ?? favorite.id) === (sections.featured?.imdbId ?? sections.featured?.id),
            )}
            onPlay={() => openMovie(sections.featured!)}
          />
        )}

        <main>
          <section>
            <h2>Browse by genre</h2>
            <GenreFilter genres={genres} value={genre} onChange={setGenre} />
            {genreLoading && <p>Loading {genre} titles...</p>}

            <Row
              title={genre === "All" ? "Highlights" : `${genre} picks`}
              movies={filtered}
              favorites={sections.favorites}
              user={user}
              onPlay={openMovie}
              layout={genre === "All" ? "carousel" : "grid"}
            />
          </section>

          {genre === "All" && (
            <section>
              {user && !!sections.continueWatching?.length && (
                <Row title="Continue Where You Left Off" movies={sections.continueWatching} user={user} allowRemove onPlay={openMovie} />
              )}
              <Row title="Trending Now" movies={sections.trending} favorites={sections.favorites} user={user} onPlay={openMovie} />
              <Row title="New & Popular" movies={sections.newReleases} favorites={sections.favorites} user={user} onPlay={openMovie} />
              <Row title="Sci-Fi Worlds" movies={sections.sciFi} favorites={sections.favorites} user={user} onPlay={openMovie} />
              <Row title="Dramas You May Like" movies={sections.drama} favorites={sections.favorites} user={user} onPlay={openMovie} />
              {!!sections.favorites?.length && (
                <Row title="My List" movies={sections.favorites} favorites={sections.favorites} user={user} onPlay={openMovie} />
              )}
              <InfiniteRows favorites={sections.favorites} onPlay={openMovie} />
            </section>
          )}
        </main>
      </div>

      <TrailerModal movie={activeMovie} onClose={() => setActiveMovie(null)} />
      <MoodChatbot onSelectMovie={openMovie} />
    </>
  );
}
```

## Navbar

The navbar provides route links, mobile menu, search modal, notifications placeholder, login/logout actions, and scroll-based visual changes.

```tsx
// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SearchModal from "./SearchModal";
import Logo from "./Logo";
import type { Movie, User } from "@/lib/types";

const links = [
  { href: "/", label: "Home" },
  { href: "/favorites", label: "My List" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar({
  user,
  onSelectMovie,
}: {
  user: User | null;
  onSelectMovie?: (movie: Movie) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className={scrolled ? "sticky nav-scrolled" : "sticky nav-transparent"}>
      <Logo />

      <nav>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={pathname === link.href ? "active" : ""}>
            {link.label}
          </Link>
        ))}
      </nav>

      <button onClick={() => setSearchOpen(true)}>Search</button>

      {user ? (
        <>
          <span>{user.name.split(" ")[0]}</span>
          <button onClick={handleLogout}>Log out</button>
        </>
      ) : (
        <Link href="/login">Sign in</Link>
      )}

      <button onClick={() => setMenuOpen((value) => !value)}>Menu</button>

      {menuOpen && <div>{links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</div>}

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(movie) => onSelectMovie?.(movie)}
      />
    </header>
  );
}
```

## Hero Banner

`Hero` displays the featured movie, handles "Play trailer", and adds/removes the movie from the default playlist.

```tsx
// src/components/Hero.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import PlaylistPickerModal from "./PlaylistPickerModal";
import type { Movie, User } from "@/lib/types";

export default function Hero({
  movie,
  user,
  isFavorite,
  onPlay,
}: {
  movie: Movie;
  user: User | null;
  isFavorite?: boolean;
  onPlay?: () => void;
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(isFavorite ?? false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const image =
    movie.backdropUrl && movie.backdropUrl !== "N/A"
      ? movie.backdropUrl
      : movie.thumbnailUrl ?? "/fallback.jpg";

  function toggleFavorite() {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!favorite) {
      setPickerOpen(true);
      return;
    }

    startTransition(async () => {
      const playlists = await fetch("/api/playlists").then((res) => res.json());
      const myList = playlists.playlists?.find((playlist: { name: string }) => playlist.name === "My List");
      if (!myList) return;

      const res = await fetch("/api/playlists/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId: myList.id,
          movieId: movie.imdbId ? null : movie.id,
          imdbId: movie.imdbId ?? null,
        }),
      });

      if (res.ok) setFavorite(false);
    });
  }

  return (
    <section className="hero">
      <Image src={image} alt={movie.title} fill priority />

      <div className="hero-content">
        <p>Featured</p>
        <h1>{movie.title}</h1>
        <p>{movie.tagline ?? movie.description}</p>
        <p>{movie.year} {movie.durationMinutes}m {movie.genre} IMDb {movie.rating}</p>

        <button onClick={onPlay}>Play trailer</button>
        <button onClick={toggleFavorite} disabled={pending}>
          {favorite ? "In My List" : "Add to Playlist"}
        </button>
      </div>

      <PlaylistPickerModal
        open={pickerOpen}
        movie={pickerOpen ? movie : null}
        onClose={() => setPickerOpen(false)}
        onAdded={() => setFavorite(true)}
      />
    </section>
  );
}
```

## Movie Row

`Row` can render either a horizontal carousel or a grid. It owns favorite state for the row, opens playlist picker, and can remove a title from continue watching.

```tsx
// src/components/Row.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import MovieCard from "./MovieCard";
import PlaylistPickerModal from "./PlaylistPickerModal";
import type { Movie, User } from "@/lib/types";

export default function Row({
  title,
  movies,
  favorites = [],
  user,
  onPlay,
  layout = "carousel",
  allowRemove = false,
}: {
  title: string;
  movies: Movie[];
  favorites?: Movie[];
  user: User | null;
  onPlay?: (movie: Movie) => void;
  layout?: "carousel" | "grid";
  allowRemove?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [visibleMovies, setVisibleMovies] = useState(movies);
  const [pickerMovie, setPickerMovie] = useState<Movie | null>(null);
  const [favoriteIds, setFavoriteIds] = useState(
    new Set(favorites.map((movie) => movie.imdbId ?? movie.id)),
  );
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setVisibleMovies(movies), [movies]);

  const favoriteIdSet = useMemo(() => favoriteIds, [favoriteIds]);

  function addOrRemoveFavorite(movie: Movie) {
    if (!user) {
      router.push("/login");
      return;
    }

    const key = movie.imdbId ?? movie.id;
    if (!favoriteIds.has(key)) {
      setPickerMovie(movie);
      return;
    }

    startTransition(async () => {
      const playlists = await fetch("/api/playlists").then((res) => res.json());
      const myList = playlists.playlists?.find((playlist: { name: string }) => playlist.name === "My List");
      if (!myList) return;

      const res = await fetch("/api/playlists/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId: myList.id,
          movieId: movie.imdbId ? null : movie.id,
          imdbId: movie.imdbId ?? null,
        }),
      });

      if (res.ok) {
        setFavoriteIds((previous) => {
          const next = new Set(previous);
          next.delete(key);
          return next;
        });
      }
    });
  }

  function removeFromHistory(movie: Movie) {
    const key = movie.imdbId ?? movie.id;
    setVisibleMovies((previous) => previous.filter((item) => (item.imdbId ?? item.id) !== key));

    const params = new URLSearchParams();
    if (movie.imdbId) params.set("imdbId", movie.imdbId);
    else params.set("movieId", String(movie.id));

    startTransition(async () => {
      const res = await fetch(`/api/history?${params}`, { method: "DELETE" });
      if (!res.ok) setVisibleMovies((previous) => [movie, ...previous]);
    });
  }

  if (!movies.length) return null;

  return (
    <section>
      <h2>{title}</h2>
      {pending && <span>Updating...</span>}

      <div ref={scrollerRef} className={layout === "grid" ? "movie-grid" : "movie-carousel"}>
        {visibleMovies.map((movie) => (
          <MovieCard
            key={movie.imdbId ?? movie.id}
            movie={movie}
            isFavorite={favoriteIdSet.has(movie.imdbId ?? movie.id)}
            onFavorite={addOrRemoveFavorite}
            onPickPlaylist={setPickerMovie}
            onPlay={() => onPlay?.(movie)}
            showRemove={allowRemove}
            onRemove={removeFromHistory}
          />
        ))}
      </div>

      <PlaylistPickerModal
        open={!!pickerMovie}
        movie={pickerMovie}
        onClose={() => setPickerMovie(null)}
        onAdded={() => {
          if (!pickerMovie) return;
          setFavoriteIds((previous) => new Set(previous).add(pickerMovie.imdbId ?? pickerMovie.id));
        }}
      />
    </section>
  );
}
```

## Movie Card

The card is clickable, keyboard accessible, and exposes favorite/play/remove callbacks to parent components.

```tsx
// src/components/MovieCard.tsx
"use client";

import Image from "next/image";
import type { Movie } from "@/lib/types";

export default function MovieCard({
  movie,
  isFavorite,
  onFavorite,
  onPickPlaylist,
  onPlay,
  showRemove,
  onRemove,
}: {
  movie: Movie;
  isFavorite?: boolean;
  onFavorite?: (movie: Movie) => void;
  onPickPlaylist?: (movie: Movie) => void;
  onPlay?: (movie: Movie) => void;
  showRemove?: boolean;
  onRemove?: (movie: Movie) => void;
}) {
  const image =
    movie.thumbnailUrl && movie.thumbnailUrl !== "N/A"
      ? movie.thumbnailUrl
      : movie.backdropUrl ?? "/fallback.jpg";

  return (
    <article role="button" tabIndex={0} onClick={() => onPlay?.(movie)}>
      <Image src={image} alt={movie.title} fill />

      <button
        onClick={(event) => {
          event.stopPropagation();
          isFavorite ? onFavorite?.(movie) : onPickPlaylist?.(movie);
        }}
      >
        {isFavorite ? "Heart filled" : "Heart"}
      </button>

      {showRemove && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onRemove?.(movie);
          }}
        >
          Remove
        </button>
      )}

      <h3>{movie.title}</h3>
      <p>{movie.year} {movie.genre} IMDb {movie.rating}</p>
    </article>
  );
}
```

## Search Modal

The search modal debounces the query and calls `/api/search?q=...`.

```tsx
// src/components/SearchModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Movie } from "@/lib/types";

const debounce = <Args extends unknown[]>(
  fn: (...args: Args) => void | Promise<void>,
  delay: number,
) => {
  let timeout: NodeJS.Timeout | undefined;
  return (...args: Args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

export default function SearchModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (movie: Movie) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useMemo(
    () =>
      debounce(async (q: string) => {
        if (!q.trim()) {
          setResults([]);
          return;
        }

        setLoading(true);
        const data = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
          .then((res) => res.json())
          .catch(() => ({ results: [] }));

        setResults(data.results ?? []);
        setLoading(false);
      }, 280),
    [],
  );

  useEffect(() => {
    if (!open) return;
    doSearch(query);
  }, [query, open, doSearch]);

  if (!open) return null;

  return (
    <div className="modal">
      <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} />
      <button onClick={onClose}>Close</button>

      {loading && <p>Searching...</p>}
      {!loading && results.map((movie) => (
        <button
          key={movie.slug}
          onClick={() => {
            onSelect(movie);
            onClose();
          }}
        >
          {movie.title} {movie.year}
        </button>
      ))}
    </div>
  );
}
```

## Signup Flow

Signup is a three-step client flow:

1. Request OTP with email and password.
2. Verify OTP.
3. Complete profile with name, phone, date of birth, gender, five genres, and three languages.

```tsx
// src/components/SignupClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

type Step = "request" | "verify" | "profile";

export default function SignupClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const profileRef = useRef({
    name: "",
    phone: "",
    dateOfBirth: "",
    gender: "prefer_not_to_say",
    genres: [] as string[],
    languages: [] as string[],
    preferred_genres: [] as string[],
    preferred_languages: [] as string[],
  });

  function requestOtp(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/auth/signup/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      res.ok ? setStep("verify") : setError("Unable to send code");
    });
  }

  function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      res.ok ? setStep("profile") : setError("Invalid code");
    });
  }

  function submitProfile(event: React.FormEvent) {
    event.preventDefault();
    const profile = profileRef.current;

    if (profile.genres.length !== 5) return setError("Please select exactly 5 genres");
    if (profile.languages.length !== 3) return setError("Please select exactly 3 languages");

    startTransition(async () => {
      const res = await fetch("/api/auth/signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      }
    });
  }

  return (
    <div>
      {error && <p>{error}</p>}
      {step === "request" && <form onSubmit={requestOtp}>Email/password form</form>}
      {step === "verify" && <form onSubmit={verifyOtp}>OTP form</form>}
      {step === "profile" && <form onSubmit={submitProfile}>Profile preference form</form>}
      {pending && <p>Please wait...</p>}
    </div>
  );
}
```

## Mood Chatbot

The chatbot keeps local chat state and calls `/api/chat/recommend` with a mood or free-text message.

```tsx
// src/components/MoodChatbot.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { Movie } from "@/lib/types";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  movies?: Movie[];
};

const QUICK_MOODS = ["happy", "sad", "stressed", "bored", "romantic", "chill"];

export default function MoodChatbot({ onSelectMovie }: { onSelectMovie: (movie: Movie) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "initial", role: "assistant", text: "Tell me your mood and I will suggest movies." },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending, open]);

  async function sendMood(payload: { mood?: string; message?: string }) {
    const text = payload.message?.trim() ?? "";
    if (!payload.mood && !text) return;

    if (text) setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
    setPending(true);

    const data = await fetch("/api/chat/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mood: payload.mood ?? null,
        message: text,
        history: messages.slice(-8).map(({ role, text }) => ({ role, text })),
      }),
    }).then((res) => res.json());

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: `${data.reply} [Mood: ${data.moodLabel}]`,
        movies: data.movies ?? [],
      },
    ]);
    setPending(false);
  }

  return (
    <>
      <button onClick={() => setOpen((value) => !value)}>Mood chat</button>

      {open && (
        <div className="chatbot">
          <div ref={scrollRef}>
            {messages.map((message) => (
              <div key={message.id}>
                <p>{message.text}</p>
                {message.movies?.slice(0, 6).map((movie) => (
                  <button key={movie.imdbId ?? movie.id} onClick={() => onSelectMovie(movie)}>
                    {movie.title}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {QUICK_MOODS.map((mood) => (
            <button key={mood} onClick={() => sendMood({ mood, message: `I am feeling ${mood}` })}>
              {mood}
            </button>
          ))}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendMood({ message: input });
              setInput("");
            }}
          >
            <input value={input} onChange={(event) => setInput(event.target.value)} />
            <button disabled={pending}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}
```

## Frontend Data Flow

```txt
Home page
  -> getCurrentUser()
  -> getHomeSections(userId)
  -> ClientHome
      -> Navbar
          -> SearchModal
              -> GET /api/search
      -> Hero
          -> GET /api/playlists
          -> POST/DELETE /api/playlists/items
      -> Row
          -> MovieCard
          -> PlaylistPickerModal
          -> DELETE /api/history
      -> TrailerModal
          -> GET /api/trailer
          -> POST /api/history
      -> MoodChatbot
          -> POST /api/chat/recommend
```

## Important Frontend Ideas

- Server components load secure user/catalog data before rendering.
- Client components own UI state such as selected movie, search query, genre, and chat messages.
- Movie identity usually uses `movie.imdbId ?? movie.id` so TMDB and local movies both work.
- Anonymous users are redirected to login/signup before actions that require an account.
- Favorites are implemented as playlist items in the default `"My List"` playlist.
- Continue watching is created and updated through watch history.
