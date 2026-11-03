import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getArchiveMetadata } from "@/lib/archive";

type ClassicFilmPageProps = PageProps<'/classics/[identifier]'>;

const IDENTIFIER_PATTERN = /^[A-Za-z0-9._-]+$/;

export default function ClassicFilmPage(props: ClassicFilmPageProps) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <Link href="/classics" className="text-sm text-sky-400 transition hover:text-sky-300">
        ← All classics
      </Link>
      <Suspense
        fallback={
          <div className="mt-6 aspect-video animate-pulse rounded-2xl border border-white/10 bg-white/5" />
        }
      >
        <Player searchParams={props.searchParams} params={props.params} />
      </Suspense>
    </main>
  );
}

async function Player(props: ClassicFilmPageProps) {
  const { identifier } = await props.params;
  if (!IDENTIFIER_PATTERN.test(identifier)) notFound();

  const meta = await getArchiveMetadata(identifier).catch(() => null);
  const title = meta?.title ?? identifier;

  return (
    <article className="mt-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-foreground/50">
        {meta?.year ?? "Year unknown"} · Public domain film from the Internet Archive
      </p>

      <div className="mt-5 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
        <iframe
          src={`https://archive.org/embed/${encodeURIComponent(identifier)}`}
          title={title}
          allowFullScreen
          className="h-full w-full"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        />
      </div>

      <p className="mt-3 text-xs text-foreground/40">
        Playback and image provided by{" "}
        <a
          href={`https://archive.org/details/${encodeURIComponent(identifier)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground/60"
        >
          archive.org
        </a>
        , where the film is free of copyright restrictions.
      </p>
    </article>
  );
}
