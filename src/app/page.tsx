import { Suspense } from "react";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { RegionSelect } from "@/components/RegionSelect";
import { TitleCard } from "@/components/TitleCard";
import { ClassicCard } from "@/components/ClassicCard";
import {
  getPopularTitles,
  normalizeRegion,
  searchTitles,
  TmdbConfigError,
} from "@/lib/tmdb";
import { searchClassicFilms, type ClassicFilm } from "@/lib/archive";

export default function Home(props: PageProps<'/'>) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <section className="flex flex-col items-center gap-6 py-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            StreamRadar
          </span>
        </h1>
        <p className="max-w-md text-sm text-foreground/60">
          Find out where any movie or series is streaming — in your region.
        </p>
        <Suspense fallback={<div className="h-11 w-full max-w-xl" />}>
          <HomeSearch searchParams={props.searchParams} />
        </Suspense>
        <Link
          href="/classics"
          className="text-sm text-emerald-400/90 transition hover:text-emerald-300"
        >
          🎞 Browse classic cinema — free, public domain →
        </Link>
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
        <Results searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function HomeSearch({
  searchParams,
}: Pick<PageProps<'/'>, "searchParams">) {
  const { q, region } = await searchParams;
  return (
    <>
      <SearchBox region={normalizeRegion(region)} defaultValue={typeof q === "string" ? q : undefined} />
      <RegionSelect value={normalizeRegion(region)} />
    </>
  );
}

async function Results({ searchParams }: Pick<PageProps<'/'>, "searchParams">) {
  const { q, region: rawRegion } = await searchParams;
  const region = normalizeRegion(rawRegion);
  const query = typeof q === "string" ? q.trim() : "";

  if (!query) {
    const popular = await getPopularTitles();
    return (
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground/80">
          Popular right now
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {popular.map((item) => (
            <TitleCard key={`${item.mediaType}-${item.id}`} item={item} region={region} />
          ))}
        </div>
      </section>
    );
  }

  let results;
  try {
    results = await searchTitles(query);
  } catch (error) {
    if (error instanceof TmdbConfigError) throw error;
    return (
      <p className="py-8 text-center text-sm text-red-400">
        {error instanceof Error ? error.message : "Something went wrong."}
      </p>
    );
  }

  // Free public-domain matches from the Internet Archive (best effort).
  let classics: ClassicFilm[] = [];
  try {
    classics = await searchClassicFilms(query, 6);
  } catch {
    classics = [];
  }

  if (results.length === 0 && classics.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground/50">
        Nothing found for “{query}”. Try another title.
      </p>
    );
  }

  return (
    <>
      {results.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground/80">
            Results for “{query}”
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((item) => (
              <TitleCard key={`${item.mediaType}-${item.id}`} item={item} region={region} />
            ))}
          </div>
        </section>
      )}

      {results.length === 0 && resultsNote(query)}

      {classics.length > 0 && (
        <section className={results.length > 0 ? "mt-10" : ""}>
          <h2 className="mb-4 text-lg font-semibold text-emerald-400/90">
            🎞 Free classics matching “{query}”
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {classics.map((film) => (
              <ClassicCard key={film.identifier} film={film} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function resultsNote(query: string) {
  return (
    <section>
      <p className="text-sm text-foreground/50">
        No streaming results for “{query}”.
      </p>
    </section>
  );
}
