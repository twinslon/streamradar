/**
 * Nightly availability sync.
 *
 * Pulls the week's trending movies + series from TMDB, upserts them into
 * `titles`, snapshots watch-provider payloads per region into
 * `availability`, and prunes snapshots older than KEEP_DAYS.
 *
 * The committed data/streamradar.db is deployed read-only; pages fall back
 * to live TMDB for anything not covered.
 *
 * Usage: node scripts/sync.mjs   (env: TMDB_READ_TOKEN or TMDB_API_KEY,
 * optional DB_PATH, SYNC_REGIONS, SYNC_TITLES)
 */
import Database from "better-sqlite3";

const DB_PATH = process.env.DB_PATH ?? "data/streamradar.db";
const REGIONS = (process.env.SYNC_REGIONS ?? "BG,US")
  .split(",")
  .map((r) => r.trim().toUpperCase())
  .filter(Boolean);
const TITLES_PER_TYPE = Number(process.env.SYNC_TITLES ?? 40);
const KEEP_DAYS = 14;
const BASE = "https://api.themoviedb.org/3";

const token = process.env.TMDB_READ_TOKEN?.trim();
const apiKey = process.env.TMDB_API_KEY?.trim();
if (!token && !apiKey) {
  console.error("Missing TMDB credentials (TMDB_READ_TOKEN or TMDB_API_KEY)");
  process.exit(1);
}

async function tmdb(path, params = {}) {
  const url = new URL(BASE + path);
  url.searchParams.set("language", "en-US");
  if (!token && apiKey) url.searchParams.set("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`TMDB ${path} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS titles (
    media_type   TEXT    NOT NULL,
    tmdb_id      INTEGER NOT NULL,
    title        TEXT    NOT NULL,
    year         INTEGER,
    poster_path  TEXT,
    popularity   REAL,
    updated_at   TEXT    NOT NULL,
    PRIMARY KEY (media_type, tmdb_id)
  );
  CREATE TABLE IF NOT EXISTS availability (
    media_type   TEXT    NOT NULL,
    tmdb_id      INTEGER NOT NULL,
    region       TEXT    NOT NULL,
    day          TEXT    NOT NULL,
    payload_json TEXT    NOT NULL,
    fetched_at   TEXT    NOT NULL,
    PRIMARY KEY (media_type, tmdb_id, region, day)
  );
`);

console.log("Fetching trending titles…");
const [movies, shows] = await Promise.all([
  tmdb("/trending/movie/week"),
  tmdb("/trending/tv/week"),
]);

const upsertTitle = db.prepare(`
  INSERT INTO titles (media_type, tmdb_id, title, year, poster_path, popularity, updated_at)
  VALUES (@media_type, @tmdb_id, @title, @year, @poster_path, @popularity, @updated_at)
  ON CONFLICT(media_type, tmdb_id) DO UPDATE SET
    title = excluded.title,
    year = excluded.year,
    poster_path = excluded.poster_path,
    popularity = excluded.popularity,
    updated_at = excluded.updated_at
`);

const now = new Date().toISOString();
const titles = [];
for (const raw of [
  ...(movies.results ?? []).slice(0, TITLES_PER_TYPE),
  ...(shows.results ?? []).slice(0, TITLES_PER_TYPE),
]) {
  const media_type = raw.title ? "movie" : "tv";
  const title = media_type === "movie" ? raw.title : raw.name;
  if (!title) continue;
  const date = media_type === "movie" ? raw.release_date : raw.first_air_date;
  titles.push({
    media_type,
    tmdb_id: raw.id,
    title,
    year: date ? Number(String(date).slice(0, 4)) : null,
    poster_path: raw.poster_path ?? null,
    popularity: raw.popularity ?? 0,
  });
}
for (const t of titles) upsertTitle.run({ ...t, updated_at: now });
console.log(`Upserted ${titles.length} trending titles into 'titles'`);

const upsertAvailability = db.prepare(`
  INSERT INTO availability (media_type, tmdb_id, region, day, payload_json, fetched_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(media_type, tmdb_id, region, day) DO UPDATE SET
    payload_json = excluded.payload_json,
    fetched_at = excluded.fetched_at
`);

let written = 0;
let failed = 0;
for (const t of titles) {
  let providers;
  try {
    providers = await tmdb(`/${t.media_type}/${t.tmdb_id}/watch/providers`);
  } catch (err) {
    console.warn(`providers failed for ${t.media_type}/${t.tmdb_id}: ${err.message}`);
    failed++;
    continue;
  }
  for (const region of REGIONS) {
    const entry = providers.results?.[region];
    const payload = entry
      ? {
          link: entry.link ?? null,
          stream: entry.flatrate ?? [],
          rent: entry.rent ?? [],
          buy: entry.buy ?? [],
        }
      : { empty: true };
    upsertAvailability.run(
      t.media_type,
      t.tmdb_id,
      region,
      today(),
      JSON.stringify(payload),
      now,
    );
    written++;
  }
  await sleep(150); // stay polite with the TMDB API
}

db.prepare("DELETE FROM availability WHERE day < ?").run(daysAgo(KEEP_DAYS));

console.log(`Provider snapshots written: ${written} (failed title lookups: ${failed})`);
for (const row of db
  .prepare(
    "SELECT region, COUNT(DISTINCT tmdb_id) AS titles FROM availability WHERE day = ? GROUP BY region",
  )
  .all(today())) {
  console.log(`  ${row.region}: ${row.titles} titles with data today`);
}
db.close();
