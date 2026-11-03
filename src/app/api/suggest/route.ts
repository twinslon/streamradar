import { NextResponse, type NextRequest } from "next/server";
import { imageUrl, searchTitles } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();

  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchTitles(q);
    return NextResponse.json({
      results: results.slice(0, 8).map((item) => ({
        id: item.id,
        mediaType: item.mediaType,
        title: item.title,
        year: item.year,
        posterUrl: imageUrl(item.posterPath, "w92"),
      })),
    });
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}
