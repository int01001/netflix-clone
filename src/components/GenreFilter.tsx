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
                ? "border-white bg-white text-black"
                : "border-white/20 bg-white/5 text-slate-100 hover:border-white/40"
            }`}
          >
            {genre}
          </motion.button>
        );
      })}
    </div>
  );
}
