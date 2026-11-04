import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://streamradar-eight.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/classics", "/watchlist"];
  return routes.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.7,
  }));
}
