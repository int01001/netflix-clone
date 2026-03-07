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
      <div className="relative h-8 w-8 overflow-hidden rounded-md border border-red-200/30 bg-[linear-gradient(135deg,#ff2a2f_0%,#7b000f_100%)] shadow-[0_10px_24px_rgba(229,9,20,0.45)]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.35),transparent_55%)]" />
      </div>
      <span className="text-xl font-bold text-white">CineWave</span>
    </motion.div>
  );
}

export default Logo;
