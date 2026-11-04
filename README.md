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

Done:
- [x] Browse by platform — `/platform/netflix?region=BG`, dynamic per-region provider resolution
- [x] Nightly availability sync into SQLite (GitHub Action) — trending titles
      × BG/US; pages read the DB first, live TMDB as fallback
- [x] Personal watchlist with anonymous share codes (Upstash Redis)
- [x] "Recently changed on streaming" — daily diff of provider snapshots
- [x] Public-domain classics section, searchable, with inline players
- [x] Typeahead search across TMDB + Internet Archive
- [x] Per-title SEO metadata + OG share images
- [x] Classics pagination ("Popular with viewers" pages 1–20)
- [x] sitemap.xml / robots.txt

Next up:
- [ ] TMDB enrichment of classics player pages (match IA film → TMDB entry
      for cast, ratings, proper titles)
- [ ] Generic notifications via browser web push (provider-agnostic)
- [ ] Person pages (clickable cast filmographies)
- [ ] Unit tests for the public-domain matching heuristics
- [ ] PWA manifest, `/` search shortcut
