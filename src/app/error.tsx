"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isConfig = error.name === "TmdbConfigError";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">
        {isConfig ? "Setup required 🔑" : "Something went wrong"}
      </h1>

      {isConfig ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-left text-sm leading-relaxed text-foreground/80">
          <p className="mb-2 font-semibold">Add your free TMDB credentials:</p>
          <ol className="list-decimal space-y-1 pl-5 text-foreground/60">
            <li>
              Create an account at{" "}
              <a
                href="https://www.themoviedb.org/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300"
              >
                themoviedb.org
              </a>
            </li>
            <li>
              Go to{" "}
              <a
                href="https://www.themoviedb.org/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300"
              >
                Settings → API
              </a>{" "}
              and request a Developer key
            </li>
            <li>
              Put the <code className="rounded bg-white/10 px-1">API Read Access Token</code>{" "}
              into <code className="rounded bg-white/10 px-1">.env.local</code> as{" "}
              <code className="rounded bg-white/10 px-1">TMDB_READ_TOKEN</code>
            </li>
            <li>Restart the dev server</li>
          </ol>
        </div>
      ) : (
        <p className="text-sm text-foreground/60">{error.message}</p>
      )}

      <button
        onClick={reset}
        className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
      >
        Try again
      </button>
    </main>
  );
}
