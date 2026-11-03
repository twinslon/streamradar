"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Suggestion {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string | null;
  posterUrl: string | null;
  archiveIdentifier: string | null;
}

const MIN_CHARS = 3;
const DEBOUNCE_MS = 250;

export function SearchBox({
  region,
  defaultValue,
}: {
  region: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue ?? "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(async () => {
      if (q.length < MIN_CHARS) {
        setItems([]);
        setOpen(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { results: Suggestion[] };
        if (controller.signal.aborted) return;
        setItems(data.results ?? []);
        setActive(-1);
        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setItems([]);
          setOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goTo(item: Suggestion) {
    setOpen(false);
    setQuery(item.title);
    if (item.archiveIdentifier) {
      router.push(`/classics/${encodeURIComponent(item.archiveIdentifier)}`);
    } else {
      router.push(`/title/${item.mediaType}/${item.id}?region=${region}`);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, -1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      goTo(items[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <form action="/" className="flex w-full gap-2" role="search" aria-label="Search movies and series">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => items.length > 0 && setOpen(true)}
          placeholder="Search movies & series…"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="search-suggestions"
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-foreground placeholder:text-foreground/40 outline-none transition focus:border-sky-400/60 focus:bg-white/10"
        />
        <input type="hidden" name="region" value={region} />
        <button
          type="submit"
          className="h-11 shrink-0 rounded-xl bg-sky-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
        >
          Search
        </button>
      </form>

      {open && (
        <ul
          id="search-suggestions"
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
          role="listbox"
          aria-label="Search suggestions"
        >
          {items.length === 0 && (
            <li className="px-4 py-3 text-sm text-foreground/40">
              {loading ? "Searching…" : "No matches"}
            </li>
          )}
          {items.map((item, index) => (
            <li
              key={
                item.archiveIdentifier
                  ? `archive-${item.archiveIdentifier}`
                  : `${item.mediaType}-${item.id}`
              }
              role="option"
              aria-selected={index === active}
            >
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => goTo(item)}
                onMouseEnter={() => setActive(index)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                  index === active ? "bg-white/10" : ""
                }`}
              >
                {item.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- tiny thumbnail, plain img avoids loader round-trips in the dropdown
                  <img
                    src={item.posterUrl}
                    alt=""
                    width={32}
                    height={48}
                    className="h-12 w-8 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-8 shrink-0 items-center justify-center rounded bg-slate-800 text-sm">
                    🎬
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                {item.archiveIdentifier && (
                  <span className="shrink-0 rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                    Free
                  </span>
                )}
                <span className="shrink-0 text-xs text-foreground/40">
                  {item.year ?? "—"} · {item.mediaType === "movie" ? "Movie" : "Series"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
