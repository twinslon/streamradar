import { ClassicCard } from "@/components/ClassicCard";
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
        <ClassicCard key={film.identifier} film={film} />
      ))}
    </div>
  );
}
