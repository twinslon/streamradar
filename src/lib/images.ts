const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

/** Build a TMDB image URL for a poster/backdrop/logo path. Client-safe. */
export function imageUrl(path: string | null, size: string): string | null {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
}
