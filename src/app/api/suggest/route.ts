import { NextResponse, type NextRequest } from "next/server";
import { searchTitles } from "@/lib/tmdb";
import { imageUrl } from "@/lib/images";
import { searchClassicFilms } from "@/lib/archive";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();

  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const [tmdb, classics] = await Promise.allSettled([
    searchTitles(q),
    searchClassicFilms(q, 4),
  ]);

  if (tmdb.status === "rejected" && classics.status === "rejected") {
    return NextResponse.json({ results: [] }, { status: 502 });
  }

  const tmdbItems =
    tmdb.status === "fulfilled"
      ? tmdb.value.slice(0, 6).map((item) => ({
          id: item.id,
          mediaType: item.mediaType,
          title: item.title,
          year: item.year,
          posterUrl: imageUrl(item.posterPath, "w92"),
          archiveIdentifier: null,
        }))
      : [];

  // Skip archive films whose title matches a TMDB result already shown —
  // that title's detail page already carries the "free" link.
  const tmdbTitles = tmdbItems.map((item) => ({
    normalized: item.title.toLowerCase().replace(/[^a-z0-9]/g, ""),
  }));

  const isDuplicate = (title: string): boolean => {
    const candidate = title.toLowerCase().replace(/[^a-z0-9]/g, "");
    return tmdbTitles.some(
      ({ normalized }) =>
        candidate === normalized ||
        (candidate.startsWith(normalized) || normalized.startsWith(candidate)
          ? Math.min(candidate.length, normalized.length) /
              Math.max(candidate.length, normalized.length) >=
            0.6
          : false),
    );
  };

  const classicItems =
    classics.status === "fulfilled"
      ? classics.value
          .filter((film) => !isDuplicate(film.title))
          .slice(0, 4)
          .map((film) => ({
            id: 0,
            mediaType: "movie" as const,
            title: film.title,
            year: film.year !== null ? String(film.year) : null,
            posterUrl: `https://archive.org/services/img/${encodeURIComponent(film.identifier)}`,
            archiveIdentifier: film.identifier,
          }))
      : [];

  return NextResponse.json({ results: [...tmdbItems, ...classicItems] });
}
