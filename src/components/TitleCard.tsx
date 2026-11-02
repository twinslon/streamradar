import Image from "next/image";
import Link from "next/link";
import { imageUrl, type SearchResult } from "@/lib/tmdb";

export function TitleCard({ item, region }: { item: SearchResult; region: string }) {
  const poster = imageUrl(item.posterPath, "w342");
  const typeLabel = item.mediaType === "movie" ? "Movie" : "Series";

  return (
    <Link
      href={`/title/${item.mediaType}/${item.id}?region=${region}`}
      className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-sky-400/50 hover:bg-white/10"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-800/60">
        {poster ? (
          <Image
            src={poster}
            alt={`Poster for ${item.title}`}
            fill
            sizes="(min-width: 1024px) 180px, (min-width: 640px) 30vw, 45vw"
            className="object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-foreground/20">
            🎬
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-[11px] font-medium tracking-wide text-sky-300 uppercase">
          {typeLabel}
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold" title={item.title}>
          {item.title}
        </p>
        <p className="mt-0.5 text-xs text-foreground/50">
          {item.year ?? "—"}
          {item.voteAverage > 0 && (
            <span className="ml-2 text-amber-300">★ {item.voteAverage.toFixed(1)}</span>
          )}
        </p>
      </div>
    </Link>
  );
}
