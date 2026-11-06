import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { SearchBox } from "@/components/SearchBox";
import { RegionSelect } from "@/components/RegionSelect";
import { TitleCard } from "@/components/TitleCard";
import { ClassicCard } from "@/components/ClassicCard";
import {
  getTrendingTitles,
  normalizeRegion,
  searchTitles,
  TmdbConfigError,
  imageUrl,
  type SearchResult,
} from "@/lib/tmdb";
import { searchClassicFilms, type ClassicFilm } from "@/lib/archive";
import { getCuratedPlatforms, type PlatformInfo } from "@/lib/providers";
import {
  getRecentAvailabilityChanges,
  getStoredAvailability,
  regionHasSnapshots,
} from "@/lib/db";
import { REGIONS } from "@/lib/regions";

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
    const [movies, series] = await Promise.all([
      getTrendingTitles("movie"),
      getTrendingTitles("tv"),
    ]);

    // If we have snapshot data for this region, hard-filter: every card
    // must be verified watchable here. Unknown titles (never synced) are
    // excluded — trending churns daily and unsynced newcomers are usually
    // the un-watchable ones. Regions without snapshot data keep the
    // worldwide list.
    const regionHasData = regionHasSnapshots(region);
    const availableInRegion = (items: SearchResult[]) => {
      const watchable = items.filter((item) => {
        const stored = getStoredAvailability(item.mediaType, String(item.id), region);
        if (stored === null) return !regionHasData;
        return stored.stream.length + stored.rent.length + stored.buy.length > 0;
      });
      return { watchable: watchable.slice(0, 12), known: regionHasData };
    };

    const moviesResult = availableInRegion(movies);
    const seriesResult = availableInRegion(series);
    const regionFiltered =
      moviesResult.known || seriesResult.known;
    const regionName =
      REGIONS.find((r) => r.code === region)?.name ?? region;

    return (
      <>
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground/80">
            {regionFiltered
              ? `Trending movies in ${regionName}`
              : "Trending movies this week"}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {moviesResult.watchable.map((item, index) => (
              <TitleCard
                key={`${item.mediaType}-${item.id}`}
                item={item}
                region={region}
                priority={index < 4}
              />
            ))}
          </div>
        </section>
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-foreground/80">
            {regionFiltered
              ? `Trending series in ${regionName}`
              : "Trending series this week"}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {seriesResult.watchable.map((item) => (
              <TitleCard key={`${item.mediaType}-${item.id}`} item={item} region={region} />
            ))}
          </div>
        </section>
        <PlatformStrip region={region} />
        <RecentChanges />
      </>
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

async function PlatformStrip({ region }: { region: string }) {
  "use cache";
  cacheLife("hours");

  let platforms: PlatformInfo[] = [];
  try {
    platforms = await getCuratedPlatforms(region);
  } catch {
    return null;
  }
  if (platforms.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold text-foreground/80">
        Browse by platform
      </h2>
      <div className="flex flex-wrap gap-2">
        {platforms.map((platform) => {
          const logo = imageUrl(platform.logoPath, "w92");
          return (
            <Link
              key={platform.slug}
              href={`/platform/${platform.slug}?region=${region}`}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:border-sky-400/50 hover:bg-white/10"
            >
              {logo && (
                <Image
                  src={logo}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded"
                />
              )}
              {platform.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

async function RecentChanges() {
  "use cache";
  cacheLife("hours");

  const changes = getRecentAvailabilityChanges(7);
  if (changes.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold text-foreground/80">
        Recently changed on streaming
      </h2>
      <ul className="flex flex-col gap-2">
        {changes.map((change) => (
          <li
            key={`${change.mediaType}-${change.tmdbId}-${change.region}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <Link
              href={`/title/${change.mediaType}/${change.tmdbId}?region=${change.region}`}
              className="font-medium text-sky-300 transition hover:text-sky-200"
            >
              {change.title}
            </Link>
            <span className="text-xs text-foreground/40">
              {change.region} · {change.day}
            </span>
            <span className="flex flex-wrap gap-1.5">
              {change.added.map((provider) => (
                <span
                  key={`added-${provider.id}`}
                  className="rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-xs text-emerald-300"
                >
                  ＋ {provider.name}
                </span>
              ))}
              {change.removed.map((provider) => (
                <span
                  key={`removed-${provider.id}`}
                  className="rounded-md bg-rose-400/15 px-1.5 py-0.5 text-xs text-rose-300"
                >
                  − {provider.name}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
