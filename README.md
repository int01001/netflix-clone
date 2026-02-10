# CineWave — Netflix‑style clone

A Netflix-inspired streaming UI built with Next.js (App Router), React, Tailwind CSS v4, Framer Motion, and a MySQL-backed auth layer. Includes animated loading, login/signup flows, and local database seed data.

## Stack
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4
- Framer Motion + Heroicons
- MySQL (via `mysql2`), JWT auth, bcrypt password hashing

## Quick start
```bash
npm install
cp .env.example .env            # adjust DB + AUTH_SECRET
npm install
npm run db:setup                # creates DB/tables + seeds (needs a local MySQL server)
npm run dev
```

Visit http://localhost:3000 to browse the cinematic home, or go to `/login` and `/signup` to test auth. Favorites toggle is available on cards and the hero banner (stored in MySQL when available, otherwise the UI falls back to in-memory seed data). Search, trailers, and sections use OMDb + YouTube embeds (no TMDB required).

### MySQL setup notes
- Expects a local server on `127.0.0.1:3306` by default; configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `.env`.
- The seed script lives at `scripts/init-db.sql`; running `npm run db:setup` applies it via `mysql2`. If MySQL isn't installed yet, install it first or point the env vars at an existing instance.

### OMDb catalog
- Get a free OMDb API key: https://www.omdbapi.com/apikey.aspx and set `OMDB_API_KEY` in `.env`.
- The app sources catalog data from OMDb (curated IMDb IDs for trending/new/sci-fi/drama) with YouTube trailer links per title.

## Available scripts
- `npm run dev` — start the Next.js dev server.
- `npm run build` / `npm run start` — production build + serve.
- `npm run lint` — lint with Next core web vitals.
- `npm run db:setup` — create & seed the local MySQL schema from `scripts/init-db.sql`.

## Key features
- Animated loading screen, hero, and card interactions (Framer Motion).
- Auth API routes (`/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`, `/api/auth/me`) with JWT cookies.
- Movie catalog API (`/api/movies`) and favorites toggle (`/api/favorites`).
- Responsive, glassy UI with gradient backdrops tuned for desktop and mobile.
