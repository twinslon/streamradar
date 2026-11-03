import Image from "next/image";
import Link from "next/link";
import { getClassicFilms, type ClassicFilm } from "@/lib/archive";

export const metadata = {
  title: "Classic cinema — free & public domain",
  description:
    "Golden-age films in the public domain, free to watch — streamed from the Internet Archive.",
};

export default function ClassicsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <section className="py-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            Classic cinema
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-foreground/60">
          Golden-age films that have entered the{" "}
          <span className="text-foreground/80">public domain</span> — free to
          watch, no subscription. Streamed from the Internet Archive.
        </p>
      </section>

      <ClassicFilms />
    </main>
  );
}

async function ClassicFilms() {
  let films: ClassicFilm[] = [];
  let failed = false;
  try {
    films = await getClassicFilms();
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

  if (films.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground/50">
        No films found — try refreshing in a minute.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {films.map((film) => (
        <Link
          key={film.identifier}
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
      ))}
    </div>
  );
}
