"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { imageUrl } from "@/lib/images";
import {
  fetchWatchlist,
  getListCode,
  removeFromList,
  setListCode,
  type WatchlistItem,
} from "@/lib/watchlist-client";

export function WatchlistView() {
  const [items, setItems] = useState<WatchlistItem[] | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [importValue, setImportValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      setCode(getListCode());
      setItems(await fetchWatchlist());
    } catch (error) {
      setCode(getListCode());
      setMessage(
        error instanceof Error && error.message === "unconfigured"
          ? "Watchlist storage isn't configured yet — lists will appear once it is."
          : "Couldn't load the watchlist — try refreshing.",
      );
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(item: WatchlistItem) {
    setItems((current) =>
      (current ?? []).filter(
        (existing) =>
          !(
            existing.mediaType === item.mediaType &&
            existing.tmdbId === item.tmdbId
          ),
      ),
    );
    try {
      setItems(await removeFromList(item));
    } catch {
      setMessage("Couldn't remove that title — refreshing.");
      load();
    }
  }

  async function importCode() {
    try {
      setListCode(importValue);
      setMessage(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid code");
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
        <span className="text-foreground/60">
          Your list code:{" "}
          <code className="rounded bg-white/10 px-2 py-0.5 font-mono text-sky-300">
            {code ?? "…"}
          </code>
        </span>
        <div className="flex items-center gap-2">
          <input
            value={importValue}
            onChange={(event) => setImportValue(event.target.value)}
            placeholder="Use another code…"
            className="h-8 w-44 rounded-lg border border-white/10 bg-white/5 px-2 text-xs outline-none focus:border-sky-400/60"
            aria-label="Import a list code"
          />
          <button
            onClick={importCode}
            className="h-8 rounded-lg border border-white/10 px-3 text-xs transition hover:border-sky-400/50"
          >
            Switch
          </button>
          <button
            onClick={() => navigator.clipboard?.writeText(code ?? "")}
            className="h-8 rounded-lg border border-white/10 px-3 text-xs transition hover:border-sky-400/50"
          >
            Copy
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-foreground/40">
        Anyone holding this code sees this list — enter it on another device to
        sync.
      </p>

      {message && (
        <p className="mt-3 text-xs text-amber-300/80" role="status">
          {message}
        </p>
      )}

      {items === null ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-sm text-foreground/50">Your watchlist is empty.</p>
          <Link
            href="/"
            className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Find something to watch →
          </Link>
          <p className="max-w-xs text-xs text-foreground/40">
            Search above or on the home page, open any title, and hit{" "}
            <span className="text-foreground/70">＋ Add to watchlist</span>.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => {
            const poster = imageUrl(item.posterPath, "w342");
            return (
              <div
                key={`${item.mediaType}-${item.tmdbId}`}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5"
              >
                <Link href={`/title/${item.mediaType}/${item.tmdbId}`}>
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-800/60">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={`Poster for ${item.title}`}
                        fill
                        sizes="(min-width: 1024px) 180px, 45vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-foreground/20">
                        🎬
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold" title={item.title}>
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {item.year ?? "—"} · {item.mediaType === "movie" ? "Movie" : "Series"}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => remove(item)}
                  aria-label={`Remove ${item.title} from watchlist`}
                  className="absolute top-2 right-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-xs text-rose-300 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                >
                  ✕ Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
