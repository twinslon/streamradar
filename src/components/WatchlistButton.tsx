"use client";

import { useEffect, useState } from "react";
import { addToList, fetchWatchlist, getListCode, removeFromList } from "@/lib/watchlist-client";
import type { MediaType } from "@/lib/tmdb";

interface Props {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
}

export function WatchlistButton({ mediaType, tmdbId, title, year, posterPath }: Props) {
  const [inList, setInList] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchWatchlist()
      .then((items) => {
        if (!cancelled) {
          setInList(
            items.some(
              (item) => item.mediaType === mediaType && item.tmdbId === tmdbId,
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setMessage("Watchlist storage isn't configured yet");
      });
    return () => {
      cancelled = true;
    };
  }, [mediaType, tmdbId]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const item = { mediaType, tmdbId, title, year, posterPath };
    try {
      getListCode(); // ensure a code exists before the first add
      const items = inList ? await removeFromList(item) : await addToList(item);
      setInList(
        items.some(
          (existing) => existing.mediaType === mediaType && existing.tmdbId === tmdbId,
        ),
      );
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "unconfigured"
          ? "Watchlist storage isn't configured yet"
          : "Couldn't update the watchlist — try again",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={toggle}
        disabled={busy || inList === null}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
          inList
            ? "bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25"
            : "bg-sky-500 text-slate-950 hover:bg-sky-400"
        }`}
      >
        {inList === null
          ? "…"
          : inList
            ? "✓ In watchlist"
            : "＋ Add to watchlist"}
      </button>
      {message && (
        <p className="mt-2 text-xs text-amber-300/80" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
