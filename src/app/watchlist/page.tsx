import { WatchlistView } from "@/components/WatchlistView";

export const metadata = {
  title: "My watchlist",
  description: "Titles you want to watch — synced by your list code.",
};

export default function WatchlistPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
          My watchlist
        </span>
      </h1>
      <WatchlistView />
    </main>
  );
}
