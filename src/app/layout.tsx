import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "StreamRadar",
    template: "%s · StreamRadar",
  },
  description:
    "Find out where any movie or series is streaming — in your region.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <footer className="mx-auto w-full max-w-5xl px-4 py-8 text-center text-[11px] leading-relaxed text-foreground/40">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB. Streaming availability data provided by{" "}
          <a
            href="https://www.justwatch.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground/60"
          >
            JustWatch
          </a>
          . Public-domain films streamed from the{" "}
          <a
            href="https://archive.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground/60"
          >
            Internet Archive
          </a>
          .
        </footer>
      </body>
    </html>
  );
}
