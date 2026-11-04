import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RegionSelect } from "@/components/RegionSelect";
import { TitleCard } from "@/components/TitleCard";
import {
  discoverByProvider,
  getRegionProviders,
  TmdbConfigError,
  imageUrl,
} from "@/lib/tmdb";
import { resolvePlatform, getCuratedPlatforms } from "@/lib/providers";
import { normalizeRegion, REGIONS } from "@/lib/regions";

type PlatformPageProps = PageProps<'/platform/[slug]'>;

const SLUG_PATTERN = /^[a-z0-9-]{2,32}$/;

export default function PlatformPage(props: PlatformPageProps) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
        }
      >
        <PlatformContent {...props} />
      </Suspense>
    </main>
  );
}

async function PlatformContent({ params, searchParams }: PlatformPageProps) {
  const { slug } = await params;
  const { region: rawRegion } = await searchParams;
  const region = normalizeRegion(rawRegion);
  if (!SLUG_PATTERN.test(slug)) notFound();

  let platform = null;
  let others: Awaited<ReturnType<typeof getCuratedPlatforms>> = [];
  try {
    platform = await resolvePlatform(slug, region);
    others = (await getCuratedPlatforms(region)).filter((p) => p.slug !== slug);
  } catch (error) {
    if (error instanceof TmdbConfigError) throw error;
    throw error;
  }

  const regionName = REGIONS.find((r) => r.code === region)?.name ?? region;
  const catalogLabel = slugToLabel(slug);

  if (!platform) {
    return (
      <article className="flex flex-col items-center gap-4 py-16 text-center">
        <Link
          href={`/?region=${region}`}
          className="self-start text-sm text-sky-400 transition hover:text-sky-300"
        >
          ← Back to search
        </Link>
        <h1 className="text-2xl font-bold">{catalogLabel} isn’t in {regionName}</h1>
        <p className="max-w-md text-sm text-foreground/60">
          This platform doesn’t appear to be offered in {regionName} right now.
          Try another region, or browse one of these:
        </p>
        <OtherPlatforms others={others} region={region} />
      </article>
    );
  }

  const [movies, series] = await Promise.all([
    discoverByProvider("movie", platform.providerId, region),
    discoverByProvider("tv", platform.providerId, region),
  ]);
  const logo = imageUrl(platform.logoPath, "w154");

  return (
    <article>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/?region=${region}`}
          className="text-sm text-sky-400 transition hover:text-sky-300"
        >
          ← Back to search
        </Link>
        <RegionSelect value={region} />
      </div>

      <header className="mt-6 flex items-center gap-4">
        {logo && (
          <Image
            src={logo}
            alt={platform.label}
            width={56}
            height={56}
            className="rounded-xl"
          />
        )}
        <h1 className="text-2xl font-bold sm:text-3xl">
          On {platform.label}{" "}
          <span className="text-foreground/50">in {regionName}</span>
        </h1>
      </header>

      {others.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {others.map((other) => (
            <Link
              key={other.slug}
              href={`/platform/${other.slug}?region=${region}`}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-foreground/60 transition hover:border-sky-400/50 hover:text-foreground"
            >
              {other.label}
            </Link>
          ))}
        </div>
      )}

      {movies.length === 0 && series.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          Nothing found for {platform.label} in {regionName} right now.
        </p>
      ) : (
        <>
          {movies.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground/80">
                Popular movies
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {movies.map((item) => (
                  <TitleCard
                    key={`${item.mediaType}-${item.id}`}
                    item={item}
                    region={region}
                  />
                ))}
              </div>
            </section>
          )}
          {series.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-lg font-semibold text-foreground/80">
                Popular series
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {series.map((item) => (
                  <TitleCard
                    key={`${item.mediaType}-${item.id}`}
                    item={item}
                    region={region}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <p className="mt-8 text-[11px] text-foreground/40">
        Catalog snapshots from TMDB/JustWatch, most popular first — refreshes
        hourly.
      </p>
    </article>
  );
}

function OtherPlatforms({ others, region }: { others: Awaited<ReturnType<typeof getCuratedPlatforms>>; region: string }) {
  if (others.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {others.map((other) => (
        <Link
          key={other.slug}
          href={`/platform/${other.slug}?region=${region}`}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-foreground/70 transition hover:border-sky-400/50 hover:text-foreground"
        >
          {other.label}
        </Link>
      ))}
    </div>
  );
}

function slugToLabel(slug: string): string {
  const known = ["netflix", "max", "disney-plus", "apple-tv", "prime-video", "skyshowtime"];
  if (known.includes(slug)) {
    return (
      {
        netflix: "Netflix",
        max: "Max",
        "disney-plus": "Disney+",
        "apple-tv": "Apple TV+",
        "prime-video": "Prime Video",
        skyshowtime: "SkyShowtime",
      }[slug] ?? slug
    );
  }
  return slug;
}
