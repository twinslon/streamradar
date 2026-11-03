import Image from "next/image";
import Link from "next/link";
import type { ClassicFilm } from "@/lib/archive";

export function ClassicCard({ film }: { film: ClassicFilm }) {
  return (
    <Link
      href={`/classics/${encodeURIComponent(film.identifier)}`}
      className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-emerald-400/50 hover:bg-white/10"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-800/60">
        <Image
          src={`https://archive.org/services/img/${encodeURIComponent(film.identifier)}`}
          alt={`Poster for ${film.title}`}
          fill
          sizes="(min-width: 1024px) 180px, (min-width: 640px) 30vw, 45vw"
          className="object-cover transition group-hover:scale-[1.03]"
          unoptimized
        />
        <span className="absolute top-2 left-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-[11px] font-medium tracking-wide text-emerald-300 uppercase">
          Free
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold" title={film.title}>
          {film.title}
        </p>
        <p className="mt-0.5 text-xs text-foreground/50">{film.year ?? "—"}</p>
      </div>
    </Link>
  );
}
