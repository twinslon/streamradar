import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { RegionSelect } from "@/components/RegionSelect";
import { WatchlistButton } from "@/components/WatchlistButton";
import {
  getWatchProviders,
  getCredits,
  getTitle,
  getTrailer,
  TmdbConfigError,
  type Provider,
  type TitleDetails,
  type Trailer,
  type WatchInfo,
} from "@/lib/tmdb";
import { imageUrl } from "@/lib/images";
import { getStoredAvailability } from "@/lib/db";
import { REGIONS, normalizeRegion } from "@/lib/regions";
import { findArchiveCopy, type ArchiveMatch } from "@/lib/archive";

type TitlePageProps = PageProps<'/title/[type]/[id]'>;

export async function generateMetadata({
  params,
}: PageProps<'/title/[type]/[id]'>): Promise<Metadata> {
  const { type, id } = await params;
  if ((type !== "movie" && type !== "tv") || !/^\d+$/.test(id)) return {};

  try {
    const details = await getTitle(type, id);
    const yearSuffix = details.year ? ` (${details.year})` : "";
    const description = details.overview
      ? details.overview.slice(0, 300)
      : `Find out where ${details.title} is streaming.`;
    const poster = imageUrl(details.posterPath, "w780") ?? undefined;

    return {
      title: `${details.title}${yearSuffix}`,
      description,
      openGraph: {
        title: `${details.title}${yearSuffix} — where to watch`,
        description,
        images: poster ? [poster] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default function TitlePage(props: TitlePageProps) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border border-white/10 bg-white/5" />}>
        <TitleContent {...props} />
      </Suspense>
    </main>
  );
}

async function TitleContent({ params, searchParams }: TitlePageProps) {
  const [{ type, id }, { region: rawRegion }] = await Promise.all([params, searchParams]);

  if (type !== "movie" && type !== "tv" || !/^\d+$/.test(id)) notFound();
  const mediaType = type as "movie" | "tv";
  const region = normalizeRegion(rawRegion);

  let details: TitleDetails;
  let watch: WatchInfo;
  let watchSource: "db" | "tmdb" = "tmdb";
  let trailer: Trailer | null = null;
  let credits: Awaited<ReturnType<typeof getCredits>>;
  try {
    // DB snapshot first (nightly sync); live TMDB fetch as fallback.
    const stored = getStoredAvailability(mediaType, id, region);
    [details, credits, trailer] = await Promise.all([
      getTitle(mediaType, id),
      getCredits(mediaType, id),
      getTrailer(mediaType, id).catch(() => null),
    ]);
    if (stored) {
      watch = stored;
      watchSource = "db";
    } else {
      watch = await getWatchProviders(mediaType, id, region);
    }
  } catch (error) {
    if (error instanceof TmdbConfigError) throw error;
    if (error instanceof Error && error.message.includes("404")) notFound();
    throw error;
  }

  // Free public-domain copy on the Internet Archive (movies only, best effort).
  let archive: ArchiveMatch | null = null;
  if (mediaType === "movie") {
    try {
      archive = await findArchiveCopy(
        details.title,
        details.year ? Number.parseInt(details.year, 10) : null,
      );
    } catch {
      archive = null;
    }
  }

  const regionName = REGIONS.find((r) => r.code === region)?.name ?? region;
  const hasOffers =
    watch.stream.length + watch.rent.length + watch.buy.length > 0 ||
    archive !== null;
  const backdrop = imageUrl(details.backdropPath, "w1280");

  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/10">
      {backdrop && (
        <div className="absolute inset-0 -z-10">
          <Image
            src={backdrop}
            alt=""
            fill
            sizes="(min-width: 896px) 896px, 100vw"
            className="object-cover opacity-25"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 p-4">
        <Link href={`/?region=${region}`} className="text-sm text-sky-400 transition hover:text-sky-300">
          ← Back to search
        </Link>
        <RegionSelect value={region} />
      </div>

      <div className="flex flex-col gap-6 p-4 pt-0 sm:flex-row">
        <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl bg-slate-800/60 sm:w-48">
          {imageUrl(details.posterPath, "w342") ? (
            <Image
              src={imageUrl(details.posterPath, "w342")!}
              alt={`Poster for ${details.title}`}
              fill
              sizes="192px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">🎬</div>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{details.title}</h1>
          {details.tagline && (
            <p className="mt-1 text-sm italic text-foreground/60">“{details.tagline}”</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-foreground/60">
            <span className="rounded-md bg-white/10 px-2 py-1 uppercase">{details.mediaType === "movie" ? "Movie" : "Series"}</span>
            {details.year && <span className="rounded-md bg-white/10 px-2 py-1">{details.year}</span>}
            {details.runtime && <span className="rounded-md bg-white/10 px-2 py-1">{details.runtime}</span>}
            {details.voteAverage > 0 && (
              <span className="rounded-md bg-amber-400/15 px-2 py-1 text-amber-300">
                ★ {details.voteAverage.toFixed(1)}
              </span>
            )}
          </div>

          {details.genres.length > 0 && (
            <p className="mt-3 text-xs text-foreground/50">{details.genres.join(" · ")}</p>
          )}

          {details.creators.length > 0 && (
            <p className="mt-1 text-xs text-foreground/50">
              Created by {details.creators.join(", ")}
            </p>
          )}
          {credits.directors.length > 0 && (
            <p className="mt-1 text-xs text-foreground/50">
              Directed by {credits.directors.join(", ")}
            </p>
          )}

          {details.overview && (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/80">
              {details.overview}
            </p>
          )}

          <WatchlistButton
            mediaType={details.mediaType}
            tmdbId={details.id}
            title={details.title}
            year={details.year}
            posterPath={details.posterPath}
          />
        </div>
      </div>

      <section
        className="border-t border-white/10 p-4 sm:p-6"
        data-provider-source={watchSource}
      >
        <h2 className="text-lg font-semibold">
          Where to watch <span className="text-foreground/50">in {regionName}</span>
        </h2>

        {hasOffers ? (
          <div className="mt-4 flex flex-col gap-4">
            {archive && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-14 shrink-0 text-sm font-medium text-emerald-400/90">Free</span>
                <a
                  href={`https://archive.org/details/${encodeURIComponent(archive.identifier)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-400/20"
                >
                  🎞 Watch free on Internet Archive
                  <span className="font-normal text-emerald-300/60">(public domain)</span>
                </a>
              </div>
            )}
            <ProviderRow label="Stream" items={watch.stream} />
            <ProviderRow label="Rent" items={watch.rent} />
            <ProviderRow label="Buy" items={watch.buy} />
            {watch.justWatchLink && (
              <a
                href={watch.justWatchLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-400/80 transition hover:text-sky-300"
              >
                More offers on JustWatch ↗
              </a>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-foreground/50">
            No streaming offers found for this title in {regionName}.
          </p>
        )}
      </section>

      {trailer && (
        <section className="border-t border-white/10 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Trailer</h2>
          <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${trailer.key}?rel=0`}
              title={trailer.name || `Trailer for ${details.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              className="h-full w-full"
            />
          </div>
        </section>
      )}

      {credits.cast.length > 0 && (
        <section className="border-t border-white/10 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Top billed cast</h2>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {credits.cast.map((member) => (
              <CastCard key={member.id} member={member} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function CastCard({
  member,
}: {
  member: { id: number; name: string; character: string; profilePath: string | null };
}) {
  const profile = imageUrl(member.profilePath, "w185");
  return (
    <div className="w-24 shrink-0">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-slate-800/60">
        {profile ? (
          <Image
            src={profile}
            alt={`Photo of ${member.name}`}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl text-foreground/20">
            👤
          </div>
        )}
      </div>
      <p className="mt-1.5 truncate text-xs font-medium" title={member.name}>
        {member.name}
      </p>
      {member.character && (
        <p
          className="truncate text-[11px] text-foreground/50"
          title={member.character}
        >
          {member.character}
        </p>
      )}
    </div>
  );
}

function ProviderRow({ label, items }: { label: string; items: Provider[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-14 shrink-0 text-sm font-medium text-foreground/60">{label}</span>
      <div className="flex flex-wrap gap-2">
        {items.map((provider) => (
          <span
            key={provider.id}
            title={provider.name}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 py-1.5 pr-3 pl-1.5 text-xs"
          >
            {imageUrl(provider.logoPath, "w92") && (
              <Image
                src={imageUrl(provider.logoPath, "w92")!}
                alt={provider.name}
                width={28}
                height={28}
                className="rounded-md"
              />
            )}
            {provider.name}
          </span>
        ))}
      </div>
    </div>
  );
}
