'use client';

import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="inline-flex items-center">
      <span className="text-[1.55rem] font-extrabold tracking-tight text-[#e50914]">
        CINEWAVE
      </span>
    </Link>
  );
}
