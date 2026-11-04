import type { MediaType } from "./tmdb";

/**
 * Server-side helpers for the anonymous watchlist storage (Upstash Redis
 * REST API). Lists are keyed by a user-generated list code; possession of
 * the code is the only "auth".
 */

const CODE_PATTERN = /^[A-Z0-9]{4}(-[A-Z0-9]{4}){2}$/;

export interface WatchlistItem {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  addedAt: string;
}

export function isValidCode(code: unknown): code is string {
  return typeof code === "string" && CODE_PATTERN.test(code);
}

export function isValidItem(value: unknown): value is Omit<WatchlistItem, "addedAt"> {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    (item.mediaType === "movie" || item.mediaType === "tv") &&
    typeof item.tmdbId === "number" &&
    Number.isInteger(item.tmdbId) &&
    item.tmdbId > 0 &&
    item.tmdbId < 10_000_000 &&
    typeof item.title === "string" &&
    item.title.length > 0 &&
    item.title.length <= 300 &&
    (item.year === null || (typeof item.year === "string" && /^\d{4}$/.test(item.year))) &&
    (item.posterPath === null ||
      (typeof item.posterPath === "string" && item.posterPath.startsWith("/") && item.posterPath.length <= 200))
  );
}

function env(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

async function kvGetJson(key: string): Promise<unknown> {
  const config = env();
  if (!config) throw new Error("unconfigured");
  const res = await fetch(`${config.url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`storage read failed: ${res.status}`);
  const data = (await res.json()) as { result?: unknown };
  if (typeof data.result !== "string") return null;
  return JSON.parse(data.result);
}

async function kvSetJson(key: string, value: unknown): Promise<void> {
  const config = env();
  if (!config) throw new Error("unconfigured");
  const res = await fetch(`${config.url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "text/plain",
    },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`storage write failed: ${res.status}`);
}

export async function readWatchlist(code: string): Promise<WatchlistItem[]> {
  const stored = await kvGetJson(`list:${code}`);
  return Array.isArray(stored) ? (stored as WatchlistItem[]) : [];
}

export async function writeWatchlist(
  code: string,
  items: WatchlistItem[],
): Promise<void> {
  await kvSetJson(`list:${code}`, items);
}

export function normalizeItem(value: Omit<WatchlistItem, "addedAt">): WatchlistItem {
  return { ...value, addedAt: new Date().toISOString() };
}
