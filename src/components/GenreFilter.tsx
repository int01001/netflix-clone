'use client';

import { useMemo } from "react";

type Props = {
  genres: string[];
  value: string;
  onChange: (genre: string) => void;
};

export default function GenreFilter({ genres, value, onChange }: Props) {
  const items = useMemo(
    () => ["All", ...genres.filter(Boolean).map((genre) => genre.trim())],
    [genres],
  );

  return (
    <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
      {items.map((genre) => {
        const active = genre.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={genre}
            onClick={() => onChange(genre)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              active
                ? "border-[#e50914] bg-[#e50914] text-white"
                : "border-white/20 bg-black/20 text-[var(--muted)] hover:border-white/45 hover:text-white"
            }`}
          >
            {genre}
          </button>
        );
      })}
    </div>
  );
}
