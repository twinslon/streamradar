import { NextResponse, type NextRequest } from "next/server";
import {
  isValidCode,
  isValidItem,
  normalizeItem,
  readWatchlist,
  writeWatchlist,
  type WatchlistItem,
} from "@/lib/watchlist";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!isValidCode(code)) {
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }

  try {
    const items = await readWatchlist(code);
    return NextResponse.json({ items });
  } catch (error) {
    const unconfigured = error instanceof Error && error.message === "unconfigured";
    return NextResponse.json(
      { error: unconfigured ? "unconfigured" : "storage error" },
      { status: unconfigured ? 503 : 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: {
    code?: unknown;
    action?: unknown;
    item?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { code, action, item } = body;
  if (!isValidCode(code)) {
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }
  if (action !== "add" && action !== "remove") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }
  if (!isValidItem(item)) {
    return NextResponse.json({ error: "invalid item" }, { status: 400 });
  }

  try {
    const items = await readWatchlist(code);
    const exists = items.some(
      (existing) =>
        existing.mediaType === item.mediaType &&
        existing.tmdbId === item.tmdbId,
    );

    let next: WatchlistItem[];
    if (action === "add") {
      if (exists) {
        next = items;
      } else {
        next = [...items, normalizeItem(item)].slice(0, 200);
      }
    } else {
      next = items.filter(
        (existing) =>
          !(
            existing.mediaType === item.mediaType &&
            existing.tmdbId === item.tmdbId
          ),
      );
    }

    await writeWatchlist(code, next);
    return NextResponse.json({ items: next });
  } catch (error) {
    const unconfigured = error instanceof Error && error.message === "unconfigured";
    return NextResponse.json(
      { error: unconfigured ? "unconfigured" : "storage error" },
      { status: unconfigured ? 503 : 502 },
    );
  }
}
