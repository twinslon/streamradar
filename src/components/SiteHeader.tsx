import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-white/10 bg-white/[0.03]">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight transition hover:text-sky-300"
        >
          <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            📡 StreamRadar
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-foreground/70">
          <Link href="/classics" className="transition hover:text-emerald-300">
            🎞 Classics
          </Link>
          <Link href="/" className="transition hover:text-sky-300">
            Search
          </Link>
        </nav>
      </div>
    </header>
  );
}
