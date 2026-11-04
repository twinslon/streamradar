import { getRegionProviders } from "./tmdb";

export interface PlatformInfo {
  slug: string;
  label: string;
  providerId: number;
  logoPath: string | null;
}

/**
 * Curated platform pages. `keywords` match TMDB provider display names
 * (which vary slightly per region, e.g. "Max" vs "HBO Max").
 */
const CATALOG: ReadonlyArray<{
  slug: string;
  label: string;
  keywords: string[];
}> = [
  { slug: "netflix", label: "Netflix", keywords: ["netflix"] },
  { slug: "max", label: "Max", keywords: ["hbo max", "max"] },
  { slug: "disney-plus", label: "Disney+", keywords: ["disney"] },
  { slug: "apple-tv", label: "Apple TV+", keywords: ["apple tv"] },
  {
    slug: "prime-video",
    label: "Prime Video",
    keywords: ["amazon prime", "prime video"],
  },
  { slug: "skyshowtime", label: "SkyShowtime", keywords: ["skyshowtime"] },
];

function matches(name: string, keywords: string[]): boolean {
  const normalized = name.toLowerCase();
  return keywords.some((keyword) =>
    keyword.length <= 4
      ? normalized === keyword
      : normalized.includes(keyword),
  );
}

/** Resolve a platform slug to the concrete TMDB provider in a region. */
export async function resolvePlatform(
  slug: string,
  region: string,
): Promise<PlatformInfo | null> {
  const entry = CATALOG.find((c) => c.slug === slug);
  if (!entry) return null;

  const providers = await getRegionProviders(region);
  const match = providers.find((p) => matches(p.name, entry.keywords));
  if (!match) return null;

  return {
    slug: entry.slug,
    label: match.name,
    providerId: match.id,
    logoPath: match.logoPath ?? null,
  };
}

/** All curated platforms actually offered in the given region. */
export async function getCuratedPlatforms(
  region: string,
): Promise<PlatformInfo[]> {
  const results = await Promise.allSettled(
    CATALOG.map((entry) => resolvePlatform(entry.slug, region)),
  );
  return results.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
}
