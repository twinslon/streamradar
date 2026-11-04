import { cacheLife } from "next/cache";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export { REGIONS, normalizeRegion } from "./regions";

export class TmdbConfigError extends Error {
  constructor() {
    super(
      "TMDB credentials are missing. Add TMDB_READ_TOKEN (preferred) or TMDB_API_KEY to .env.local — get them free at https://www.themoviedb.org/settings/api",
    );
    this.name = "TmdbConfigError";
  }
}

export class TmdbRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TmdbRequestError";
  }
}

export type MediaType = "movie" | "tv";

export interface SearchResult {
  id: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  voteAverage: number;
  overview: string;
}

export interface TitleDetails extends SearchResult {
  tagline: string | null;
  genres: string[];
  backdropPath: string | null;
  runtime: string | null;
  status: string | null;
  creators: string[];
}

export interface Provider {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface WatchInfo {
  justWatchLink: string | null;
  stream: Provider[];
  rent: Provider[];
  buy: Provider[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface CreditsInfo {
  cast: CastMember[];
  directors: string[];
}

/** Build a TMDB image URL for a poster/backdrop/logo path. */
export function imageUrl(path: string | null, size: string): string | null {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN?.trim();
  const apiKey = process.env.TMDB_API_KEY?.trim();

  if (!token && !apiKey) throw new TmdbConfigError();

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("language", "en-US");
  if (!token && apiKey) url.searchParams.set("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    throw new TmdbRequestError(
      `TMDB request failed: ${res.status} ${res.statusText}`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

function yearOf(value: string | null | undefined): string | null {
  return value && value.length >= 4 ? value.slice(0, 4) : null;
}

function normalizeSearchItem(raw: {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  overview?: string;
}): SearchResult | null {
  if (raw.media_type !== "movie" && raw.media_type !== "tv") return null;
  const title = raw.media_type === "movie" ? raw.title : raw.name;
  if (!title) return null;
  return {
    id: raw.id,
    mediaType: raw.media_type,
    title,
    year: yearOf(raw.media_type === "movie" ? raw.release_date : raw.first_air_date),
    posterPath: raw.poster_path ?? null,
    voteAverage: raw.vote_average ?? 0,
    overview: raw.overview ?? "",
  };
}

/** Multi-search across movies and series. */
export async function searchTitles(query: string): Promise<SearchResult[]> {
  "use cache";
  cacheLife("hours");

  const data = await tmdbFetch<{ results: Parameters<typeof normalizeSearchItem>[0][] }>(
    "/search/multi",
    { query, include_adult: "false" },
  );
  return data.results
    .map(normalizeSearchItem)
    .filter((item): item is SearchResult => item !== null);
}

/** Popular titles for the landing page, per media type. */
export async function getPopularTitles(type: MediaType): Promise<SearchResult[]> {
  "use cache";
  cacheLife("hours");

  const data = await tmdbFetch<{
    results: Parameters<typeof normalizeSearchItem>[0][];
  }>(`/${type}/popular`);

  return (data.results ?? [])
    .map((raw) => normalizeSearchItem({ ...raw, media_type: type }))
    .filter((item): item is SearchResult => item !== null)
    .slice(0, 12);
}

interface RawDetails {
  id: number;
  title?: string;
  name?: string;
  tagline?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  genres?: { id: number; name: string }[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  status?: string;
  created_by?: { id: number; name: string }[];
}

/** Details for a single movie or series. */
export async function getTitle(type: MediaType, id: string): Promise<TitleDetails> {
  "use cache";
  cacheLife("hours");

  const raw = await tmdbFetch<RawDetails>(`/${type}/${id}`);
  const title = type === "movie" ? raw.title : raw.name;
  if (!title) throw new TmdbRequestError(`No ${type} with id ${id}`, 404);

  let runtime: string | null = null;
  if (type === "movie" && raw.runtime) {
    runtime = `${raw.runtime} min`;
  } else if (type === "tv") {
    const ep = raw.episode_run_time?.[0];
    runtime = [
      raw.number_of_seasons ? `${raw.number_of_seasons} season${raw.number_of_seasons > 1 ? "s" : ""}` : null,
      ep ? `~${ep} min/ep` : null,
    ]
      .filter(Boolean)
      .join(" · ") || null;
  }

  return {
    id: raw.id,
    mediaType: type,
    title,
    tagline: raw.tagline || null,
    year: yearOf(type === "movie" ? raw.release_date : raw.first_air_date),
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    voteAverage: raw.vote_average ?? 0,
    overview: raw.overview ?? "",
    genres: raw.genres?.map((g) => g.name) ?? [],
    runtime,
    status: raw.status ?? null,
    creators: raw.created_by?.map((c) => c.name) ?? [],
  };
}

/** Top-billed cast + directors for a title. */
export async function getCredits(type: MediaType, id: string): Promise<CreditsInfo> {
  "use cache";
  cacheLife("hours");

  const data = await tmdbFetch<{
    cast?: { id: number; name: string; character?: string; profile_path?: string | null }[];
    crew?: { id: number; name: string; job?: string }[];
  }>(`/${type}/${id}/credits`);

  return {
    cast: (data.cast ?? []).slice(0, 12).map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character ?? "",
      profilePath: member.profile_path ?? null,
    })),
    directors: (data.crew ?? [])
      .filter((member) => member.job === "Director")
      .map((member) => member.name),
  };
}

interface RawProviders {
  results: Record<
    string,
    {
      link?: string;
      flatrate?: { provider_id: number; provider_name: string; logo_path?: string | null }[];
      rent?: { provider_id: number; provider_name: string; logo_path?: string | null }[];
      buy?: { provider_id: number; provider_name: string; logo_path?: string | null }[];
    }
  >;
}

/** Streaming/rent/buy providers for a title in a watch region (data by JustWatch). */
export async function getWatchProviders(
  type: MediaType,
  id: string,
  region: string,
): Promise<WatchInfo> {
  "use cache";
  cacheLife("hours");

  const data = await tmdbFetch<RawProviders>(`/${type}/${id}/watch/providers`);
  const entry = data.results[region];

  if (!entry) {
    return { justWatchLink: null, stream: [], rent: [], buy: [] };
  }

  const normalize = (list: NonNullable<NonNullable<RawProviders["results"][string]>["flatrate"]>): Provider[] =>
    list.map((p) => ({
      id: p.provider_id,
      name: p.provider_name,
      logoPath: p.logo_path ?? null,
    }));

  return {
    justWatchLink: entry.link ?? null,
    stream: entry.flatrate ? normalize(entry.flatrate) : [],
    rent: entry.rent ? normalize(entry.rent) : [],
    buy: entry.buy ? normalize(entry.buy) : [],
  };
}
