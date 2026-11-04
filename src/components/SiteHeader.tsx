import Link from "next/link";

const NAV_LINKS = [
  { href: "/classics", label: "🎞 Classics" },
  { href: "/watchlist", label: "＋ Watchlist" },
  { href: "/", label: "Search" },
] as const;

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
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-sky-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
