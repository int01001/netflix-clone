# CineWave - Netflix-style clone

A Netflix-inspired streaming UI built with Next.js (App Router), React, Tailwind CSS v4, Framer Motion, and a MySQL-backed auth layer.

## Stack
- Next.js 16 (App Router, TypeScript)
- React + Tailwind CSS v4
- Framer Motion + Heroicons
- MySQL (`mysql2`) for users, favorites, history
- TMDB API for movie catalog and trailer metadata

## Quick start
```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

Open `http://localhost:3000`.

## Environment
Set these values in `.env`:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `AUTH_SECRET`
- `TMDB_API_KEY` (required for full TMDB catalog and trailer lookups)

Create a TMDB API key at:
`https://www.themoviedb.org/settings/api`

## What works
- Home page sections populated from TMDB (trending, now playing, top rated, popular)
- Search powered by TMDB
- Click any movie card to open an in-app trailer modal
- Trailer auto-plays in the embedded player (no redirect required)
- Favorites and watch-history persisted in MySQL for signed-in users

## Scripts
- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint the codebase
- `npm run db:setup` - create and seed local MySQL schema
