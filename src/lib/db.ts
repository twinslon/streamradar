import Database from "better-sqlite3";
import path from "node:path";
import type { MediaType, Provider, WatchInfo } from "./tmdb";

const DB_PATH = path.join(process.cwd(), "data", "streamradar.db");
/** Snapshots older than this are ignored — live TMDB fetch takes over. */
const MAX_AGE_DAYS = 2; // enforced via SQLite date(...) in the query

type Handle = Database.Database | null;
let handle: Handle | undefined;

/** Open the deployed database read-only, once. Null if it's missing/broken. */
function open(): Handle {
  if (handle === undefined) {
    try {
      // The sync script commits the db in DELETE journal mode, so a
      // readonly open needs no -shm/-wal sidecars — safe on read-only
      // serverless filesystems.
      handle = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    } catch {
      handle = null;
    }
  }
  return handle;
}

interface RawProvider {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
}

export interface AvailabilityChange {
  mediaType: MediaType;
  tmdbId: number;
  title: string | null;
  region: string;
  /** Day the change became visible (the newer snapshot's day). */
  day: string;
  added: Provider[];
  removed: Provider[];
}

interface StoredPayload {
  link?: string | null;
  stream?: RawProvider[];
  rent?: RawProvider[];
  buy?: RawProvider[];
  empty?: boolean;
}

const toProviders = (list?: RawProvider[]): Provider[] =>
  (list ?? []).map((p) => ({
    id: p.provider_id,
    name: p.provider_name,
    logoPath: p.logo_path ?? null,
  }));

/**
 * Titles whose streaming providers changed within the recent window,
 * detected by diffing consecutive daily snapshots. Empty until at least
 * two distinct sync days exist.
 */
export function getRecentAvailabilityChanges(days = 7): AvailabilityChange[] {
  const db = open();
  if (!db) return [];
  try {
    const minDay = new Date(Date.now() - days * 86400000)
      .toISOString()
      .slice(0, 10);

    const rows = db
      .prepare(
        `SELECT a.media_type AS media_type, a.tmdb_id AS tmdb_id, a.region AS region,
                a.day AS day, a.payload_json AS payload_json, t.title AS title
         FROM availability a
         LEFT JOIN titles t ON t.media_type = a.media_type AND t.tmdb_id = a.tmdb_id
         WHERE a.day >= ?
         ORDER BY a.media_type, a.tmdb_id, a.region, a.day`,
      )
      .all(minDay) as {
      media_type: string;
      tmdb_id: number;
      region: string;
      day: string;
      payload_json: string;
      title: string | null;
    }[];

    // Group rows per title/region, keeping day-ordered payloads.
    const groups = new Map<
      string,
      { mediaType: MediaType; tmdbId: number; region: string; title: string | null; points: { day: string; stream: RawProvider[] }[] }
    >();
    for (const row of rows) {
      if (!row.title) continue;
      const key = `${row.media_type}-${row.tmdb_id}-${row.region}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          mediaType: row.media_type as MediaType,
          tmdbId: row.tmdb_id,
          region: row.region,
          title: row.title,
          points: [],
        };
        groups.set(key, group);
      }
      try {
        const payload = JSON.parse(row.payload_json) as StoredPayload;
        group.points.push({ day: row.day, stream: payload.stream ?? [] });
      } catch {
        // Skip unreadable payloads.
      }
    }

    const changes: AvailabilityChange[] = [];
    const today = new Date().toISOString().slice(0, 10);
    for (const group of groups.values()) {
      // Compare only the two most recent distinct days.
      const daysSeen = [...new Set(group.points.map((p) => p.day))].sort();
      if (daysSeen.length < 2) continue;
      const [prevDay, latestDay] = daysSeen.slice(-2);
      const prev = group.points.find((p) => p.day === prevDay);
      const latest = group.points.find((p) => p.day === latestDay);
      if (!prev || !latest) continue;

      const toMap = (points: { stream: RawProvider[] }): Map<number, Provider> => {
        const map = new Map<number, Provider>();
        for (const p of points.stream) {
          if (!map.has(p.provider_id)) {
            map.set(p.provider_id, {
              id: p.provider_id,
              name: p.provider_name,
              logoPath: p.logo_path ?? null,
            });
          }
        }
        return map;
      };

      const prevMap = toMap(prev);
      const latestMap = toMap(latest);
      const added: Provider[] = [];
      const removed: Provider[] = [];
      for (const [id, provider] of latestMap) {
        if (!prevMap.has(id)) added.push(provider);
      }
      for (const [id, provider] of prevMap) {
        if (!latestMap.has(id)) removed.push(provider);
      }
      if (added.length === 0 && removed.length === 0) continue;

      changes.push({
        mediaType: group.mediaType,
        tmdbId: group.tmdbId,
        title: group.title,
        region: group.region,
        // Day the change became visible (the newer snapshot's day).
        day: latestDay <= today ? latestDay : today,
        added,
        removed,
      });
    }

    return changes
      .sort((a, b) => b.day.localeCompare(a.day))
      .slice(0, 8);
  } catch {
    return [];
  }
}

/**
 * Latest provider snapshot for a title/region from the nightly sync,
 * or null when missing/stale (caller falls back to live TMDB).
 */
export function getStoredAvailability(
  type: MediaType,
  id: string,
  region: string,
): WatchInfo | null {
  const db = open();
  if (!db) return null;
  try {
    // Freshness is evaluated inside SQLite (`date('now', …)`) rather than
    // with JS `new Date()` — wall-clock reads are blocked during prerender
    // under Cache Components.
    const row = db
      .prepare(
        `SELECT day, payload_json FROM availability
         WHERE media_type = ? AND tmdb_id = ? AND region = ?
           AND day >= date('now', '-2 days') AND day <= date('now')
         ORDER BY day DESC LIMIT 1`,
      )
      .get(type, Number(id), region) as
      | { day: string; payload_json: string }
      | undefined;
    if (!row) return null;

    const payload = JSON.parse(row.payload_json) as StoredPayload;
    if (payload.empty) {
      return { justWatchLink: null, stream: [], rent: [], buy: [] };
    }
    return {
      justWatchLink: payload.link ?? null,
      stream: toProviders(payload.stream),
      rent: toProviders(payload.rent),
      buy: toProviders(payload.buy),
    };
  } catch {
    return null;
  }
}
