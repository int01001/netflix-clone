'use client';

import { motion } from "framer-motion";
import Logo from "@/components/Logo";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black">
      <Logo />
      <motion.div
        className="relative h-20 w-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-[var(--accent)]"
          animate={{ scale: [1, 1.25, 1], opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute inset-3 rounded-full bg-[var(--accent)]/70"
          animate={{ scale: [1, 0.8, 1], opacity: [0.9, 0.5, 0.9] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
      <p className="text-sm text-slate-300">Loading your watchlist…</p>
    </div>
  );
}
