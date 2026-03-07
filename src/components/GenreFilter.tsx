'use client';

import { useMemo } from "react";
import { motion } from "framer-motion";

type Props = {
  genres: string[];
  value: string;
  onChange: (genre: string) => void;
};

export default function GenreFilter({ genres, value, onChange }: Props) {
  const items = useMemo(
    () => ["All", ...genres.filter(Boolean).map((g) => g.trim())],
    [genres],
  );

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((genre) => {
        const active = genre.toLowerCase() === value.toLowerCase();
        return (
          <motion.button
            key={genre}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(genre)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              active
                ? "border-[var(--accent)] bg-[rgba(229,9,20,0.24)] text-white shadow-[0_10px_24px_rgba(229,9,20,0.35)]"
                : "border-white/20 bg-white/[0.03] text-slate-200 hover:border-[rgba(229,9,20,0.75)] hover:bg-[rgba(229,9,20,0.12)]"
            }`}
          >
            {genre}
          </motion.button>
        );
      })}
    </div>
  );
}
