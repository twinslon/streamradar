export function SearchBar({
  region,
  defaultValue,
}: {
  region: string;
  defaultValue?: string;
}) {
  return (
    <form
      action="/"
      className="flex w-full max-w-xl gap-2"
      role="search"
      aria-label="Search movies and series"
    >
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search movies & series…"
        autoComplete="off"
        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-foreground placeholder:text-foreground/40 outline-none transition focus:border-sky-400/60 focus:bg-white/10"
      />
      <input type="hidden" name="region" value={region} />
      <button
        type="submit"
        className="h-11 shrink-0 rounded-xl bg-sky-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
      >
        Search
      </button>
    </form>
  );
}
