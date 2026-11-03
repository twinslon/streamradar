# StreamRadar

Find out where any movie or series is streaming — in your region.

**Live: https://streamradar-eight.vercel.app** (pushes to `master` auto-deploy)

Built with Next.js (App Router, Cache Components), TypeScript, and Tailwind CSS.
Movie metadata and streaming availability come from [TMDB](https://www.themoviedb.org)
(availability data by [JustWatch](https://www.justwatch.com)).

> This product uses the TMDB API but is not endorsed or certified by TMDB.

## Setup

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup).
2. Request a Developer API key under [Settings → API](https://www.themoviedb.org/settings/api).
3. Copy `.env.example` to `.env.local` and fill in your credentials
   (`TMDB_READ_TOKEN` preferred, or `TMDB_API_KEY`).
4. Start the dev server:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## What it does (MVP)

- **Search** movies & series (TMDB multi-search)
- **Title pages** with poster, backdrop, synopsis, rating, genres
- **Where to watch**: streaming / rent / buy providers per watch region
  (BG by default; switchable to US, GB, DE, FR, and more)
- Popular titles on the landing page
- All TMDB responses cached at the data level (`use cache`) to stay well
  within rate limits

## Scripts

| Command       | Description              |
| ------------- | ------------------------ |
| `npm run dev` | Dev server (Turbopack)   |
| `npm run build` | Production build       |
| `npm run lint`  | ESLint                 |

## Roadmap

- [ ] Browse by platform ("new on Netflix this month")
- [ ] Nightly availability sync into SQLite (GitHub Action)
- [ ] Personal watchlist
- [ ] "Notify me when X arrives on platform Y" (Home Assistant integration)
