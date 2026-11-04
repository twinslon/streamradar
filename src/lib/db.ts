import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { MediaType, Provider, WatchInfo } from "./tmdb";

const DB_PATH = path.join(process.cwd(), "data", "streamradar.db");
/** Snapshots older than this are ignored — live TMDB fetch takes over. */
const MAX_AGE_DAYS = 2;

type Handle = Database.Database | null;
let handle: Handle | undefined;

/** Open the deployed database read-only, once. Null if it's missing/broken. */
function open(): Handle {
  if (handle === undefined) {
    try {
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
    const row = db
      .prepare(
        `SELECT day, payload_json FROM availability
         WHERE media_type = ? AND tmdb_id = ? AND region = ?
         ORDER BY day DESC LIMIT 1`,
      )
      .get(type, Number(id), region) as
      | { day: string; payload_json: string }
      | undefined;
    if (!row) return null;

    const today = new Date().toISOString().slice(0, 10);
    const minDay = new Date(Date.now() - MAX_AGE_DAYS * 86400000)
      .toISOString()
      .slice(0, 10);
    if (row.day < minDay || row.day > today) return null;

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

/** Diagnostics for the deployed filesystem context (temporary debugging aid). */
export function getDbDebug(): {
  cwd: string;
  dataDirExists: boolean;
  dbExists: boolean;
  openResult: "ok" | "null" | "uninitialized";
} {
  const dir = path.join(process.cwd(), "data");
  const file = path.join(DB_PATH);
  const db = open();
  return {
    cwd: process.cwd(),
    dataDirExists: fs.existsSync(dir),
    dbExists: fs.existsSync(file),
    openResult: db ? "ok" : db === null ? "null" : "uninitialized",
  };
}
