import { cacheLife } from "next/cache";

const IA_SEARCH_URL = "https://archive.org/advancedsearch.php";
const IA_METADATA_URL = "https://archive.org/metadata";

const UA_HEADER = { "User-Agent": "StreamRadar/0.1 (personal non-commercial project)" };

/**
 * IA collections that curate public-domain films. Restricting matches to
 * these keeps false positives (pirate uploads in community collections)
 * out of the "free" badge.
 */
const PD_COLLECTIONS = [
  "feature_films",
  "Film_Noir",
  "SciFi_Horror",
  "classic_cartoons",
] as const;

const PD_COLLECTION_QUERY = PD_COLLECTIONS.map(
  (collection) => `collection:(${collection})`,
).join(" OR ");

export interface ClassicFilm {
  identifier: string;
  title: string;
  year: number | null;
  downloads: number;
  collections: string[];
}

export interface ArchiveMatch {
  identifier: string;
  title: string;
  year: number | null;
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toYear(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed =
    typeof raw === "string" ? Number.parseInt(raw, 10) : typeof raw === "number" ? raw : Number.NaN;
  return Number.isFinite(parsed) && parsed > 1800 && parsed < 2100 ? parsed : null;
}

async function iaSearch(
  query: string,
  rows: number,
  page: number,
  sort?: string,
): Promise<ClassicFilm[]> {
  const url = new URL(IA_SEARCH_URL);
  url.searchParams.set("q", query);
  for (const field of ["identifier", "title", "year", "downloads", "collection"]) {
    url.searchParams.append("fl[]", field);
  }
  url.searchParams.set("rows", String(rows));
  url.searchParams.set("page", String(page));
  if (sort) url.searchParams.append("sort[]", sort);
  url.searchParams.set("output", "json");

  const res = await fetch(url, { headers: UA_HEADER });
  if (!res.ok) {
    throw new Error(`Internet Archive request failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    response?: { docs?: Record<string, unknown>[] };
  };

  return (data.response?.docs ?? [])
    .map((doc) => ({
      identifier: typeof doc.identifier === "string" ? doc.identifier : "",
      title:
        typeof doc.title === "string"
          ? doc.title
          : Array.isArray(doc.title)
            ? String(doc.title[0])
            : "Untitled",
      year: toYear(doc.year),
      downloads: typeof doc.downloads === "number" ? doc.downloads : 0,
      collections: Array.isArray(doc.collection)
        ? doc.collection.filter((c): c is string => typeof c === "string")
        : typeof doc.collection === "string"
          ? [doc.collection]
          : [],
    }))
    .filter((film) => film.identifier.length > 0);
}

/** Popular public-domain feature films from the Internet Archive. */
export async function getClassicFilms(page = 1): Promise<ClassicFilm[]> {
  "use cache";
  cacheLife("hours");
  return iaSearch("collection:(feature_films) AND mediatype:(movies)", 24, page, "downloads desc");
}

/** Metadata for a single archive.org item. */
export async function getArchiveMetadata(
  identifier: string,
): Promise<{ title: string; year: number | null } | null> {
  "use cache";
  cacheLife("hours");

  const res = await fetch(`${IA_METADATA_URL}/${encodeURIComponent(identifier)}`, {
    headers: UA_HEADER,
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { metadata?: Record<string, unknown> };
  if (!data.metadata) return null;

  return {
    title:
      typeof data.metadata.title === "string"
        ? data.metadata.title
        : Array.isArray(data.metadata.title)
          ? String(data.metadata.title[0])
          : "Untitled",
    year: toYear(data.metadata.year),
  };
}

/**
 * Look for a free, legal copy of a title on the Internet Archive
 * (public domain). Restricted to curated PD collections; matched on
 * normalized title equality or conservative containment, plus a ±1
 * year check. Items without a year must match the title exactly —
 * this keeps torrent rips ("Fight Club 2006 DvDRip …") from ever
 * earning the free badge.
 */
export async function findArchiveCopy(
  title: string,
  year: number | null,
): Promise<ArchiveMatch | null> {
  "use cache";
  cacheLife("hours");

  const cleaned = title.replace(/["']/g, "").trim();
  const docs = await iaSearch(
    `(${PD_COLLECTION_QUERY}) AND title:("${cleaned}") AND mediatype:(movies)`,
    10,
    1,
  );
  const wanted = normalizeTitle(cleaned);

  for (const doc of docs) {
    const inCuratedCollection = doc.collections.some((collection) =>
      (PD_COLLECTIONS as readonly string[]).includes(collection),
    );
    if (!inCuratedCollection) continue;

    const candidate = normalizeTitle(doc.title);
    const exact = candidate === wanted;
    const similar =
      wanted.length > 3 &&
      candidate.length > 3 &&
      (candidate.includes(wanted) || wanted.includes(candidate)) &&
      Math.min(candidate.length, wanted.length) /
        Math.max(candidate.length, wanted.length) >=
        0.6;

    const yearOk =
      doc.year !== null && year !== null
        ? Math.abs(doc.year - year) <= 1
        : exact;
    if ((exact || similar) && yearOk) {
      return { identifier: doc.identifier, title: doc.title, year: doc.year };
    }
  }
  return null;
}
