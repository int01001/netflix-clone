'use client';

import { motion } from "framer-motion";

export function Logo() {
  return (
    <motion.div
      className="flex items-center gap-2 text-lg font-semibold tracking-tight"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="h-8 w-8 rounded-md bg-[var(--accent)] shadow-lg shadow-red-900/40" />
      <span className="text-xl font-bold text-white">CineWave</span>
    </motion.div>
  );
}

export default Logo;
