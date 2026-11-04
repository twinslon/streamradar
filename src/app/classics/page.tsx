import { Suspense } from "react";
import Link from "next/link";
import { ClassicCard } from "@/components/ClassicCard";
import { SearchBox } from "@/components/SearchBox";
import { searchClassicFilms, getClassicFilms, type ClassicFilm } from "@/lib/archive";
import { normalizeRegion } from "@/lib/regions";

export const metadata = {
  title: "Classic cinema — free & public domain",
  description:
    "Golden-age films in the public domain, free to watch — streamed from the Internet Archive.",
};

export default function ClassicsPage(props: PageProps<'/classics'>) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <section className="flex flex-col items-center gap-6 py-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            Classic cinema
          </span>
        </h1>
        <p className="max-w-md text-sm text-foreground/60">
          Golden-age films that have entered the{" "}
          <span className="text-foreground/80">public domain</span> — free to
          watch, no subscription. Streamed from the Internet Archive.
        </p>
        <Suspense fallback={<div className="h-11 w-full max-w-xl" />}>
          <ClassicsSearch searchParams={props.searchParams} />
        </Suspense>
      </section>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        }
      >
        <ClassicFilms searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function ClassicsSearch({
  searchParams,
}: Pick<PageProps<'/classics'>, "searchParams">) {
  const { q, region } = await searchParams;
  // No region selector here — Archive films are public domain and
  // region-free. The region is only used for navigating TMDB suggestions.
  return (
    <SearchBox
      action="/classics"
      region={normalizeRegion(region)}
      defaultValue={typeof q === "string" ? q : undefined}
    />
  );
}

async function ClassicFilms({
  searchParams,
}: Pick<PageProps<'/classics'>, "searchParams">) {
  const { q, page: rawPage } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const page = Math.max(1, Math.min(20, Number.parseInt(String(rawPage ?? "1"), 10) || 1));

  let films: ClassicFilm[] = [];
  let failed = false;
  try {
    films = query
      ? await searchClassicFilms(query, 24)
      : await getClassicFilms(page);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <p className="py-8 text-center text-sm text-foreground/50">
        The Internet Archive isn’t answering right now — try refreshing in a
        minute.
      </p>
    );
  }

  return (
    <section>
      {query ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-emerald-400/90">
            🎞 Free classics matching “{query}”
          </h2>
          <Link
            href="/classics"
            className="text-sm text-sky-400 transition hover:text-sky-300"
          >
            Show all classics
          </Link>
        </div>
      ) : (
        <h2 className="mb-4 text-lg font-semibold text-foreground/80">
          Popular with viewers
        </h2>
      )}

      {films.length === 0 ? (
        <div className="py-8 text-center text-sm text-foreground/50">
          <p>
            {query
              ? `No free classics found for “${query}”.`
              : "No films on this page — try the previous one."}
          </p>
          {query && (
            <Link
              href={`/?q=${encodeURIComponent(query)}`}
              className="mt-2 inline-block text-sky-400 transition hover:text-sky-300"
            >
              Search everything for “{query}” →
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {films.map((film) => (
              <ClassicCard key={film.identifier} film={film} />
            ))}
          </div>

          {!query && (
            <div className="mt-8 flex justify-center gap-4 text-sm">
              {page > 1 && (
                <Link
                  href={`/classics?page=${page - 1}`}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 transition hover:border-sky-400/50"
                >
                  ← Previous
                </Link>
              )}
              {films.length >= 20 && (
                <Link
                  href={`/classics?page=${page + 1}`}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 transition hover:border-sky-400/50"
                >
                  Next page →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
