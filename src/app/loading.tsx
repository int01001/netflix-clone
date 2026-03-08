'use client';

import { motion } from "framer-motion";

export default function Loading() {
  const bars = [0, 1, 2];

  return (
    <div className="app-shell relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_50%_-14%,rgba(229,9,20,0.22),transparent_70%)]" />
      <motion.div
        className="absolute inset-0 opacity-40"
        animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 35%, rgba(229,9,20,0.08) 70%, rgba(255,255,255,0.02) 100%)",
          backgroundSize: "240% 240%",
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        <div className="flex items-end gap-2">
          {bars.map((bar) => (
            <motion.span
              key={bar}
              className="w-3 rounded-full bg-gradient-to-b from-[#ff3a45] to-[#99040c] shadow-[0_0_22px_rgba(229,9,20,0.45)]"
              animate={{ height: [22, 62, 22], opacity: [0.55, 1, 0.55] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: bar * 0.14,
              }}
            />
          ))}
        </div>

        <motion.p
          className="text-2xl font-extrabold tracking-[0.14em] text-white"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
        >
          CINEWAVE
        </motion.p>

        <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full w-24 rounded-full bg-gradient-to-r from-[#7f040b] via-[#e50914] to-[#ff4b54]"
            animate={{ x: [-92, 232] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <p className="text-sm text-[var(--muted)]">Loading your cinematic feed...</p>
      </div>
    </div>
  );
}
