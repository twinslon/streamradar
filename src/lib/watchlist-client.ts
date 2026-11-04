"use client";

/**
 * Client-side watchlist helpers. The list code lives in localStorage and
 * doubles as the identity — anyone holding the code sees the same list.
 */

import type { MediaType } from "./tmdb";

const CODE_STORAGE_KEY = "streamradar-list-code";

export interface WatchlistItem {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  addedAt?: string;
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

export function getListCode(): string {
  const existing = localStorage.getItem(CODE_STORAGE_KEY);
  if (existing && /^[A-Z0-9]{4}(-[A-Z0-9]{4}){2}$/.test(existing)) {
    return existing;
  }
  const code = randomCode();
  localStorage.setItem(CODE_STORAGE_KEY, code);
  return code;
}

export function setListCode(code: string): void {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}(-[A-Z0-9]{4}){2}$/.test(normalized)) {
    throw new Error("Codes look like ABCD-EFGH-JKLM");
  }
  localStorage.setItem(CODE_STORAGE_KEY, normalized);
}

async function api<T>(action: "get" | "post", body?: unknown): Promise<T> {
  const res =
    action === "get"
      ? await fetch(`/api/watchlist?code=${encodeURIComponent(getListCode())}`)
      : await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
  const data = (await res.json()) as T & { error?: string };
  if (data.error) throw new Error(data.error);
  return data;
}

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const data = await api<{ items: WatchlistItem[] }>("get");
  return data.items ?? [];
}

export async function addToList(item: Omit<WatchlistItem, "addedAt">): Promise<WatchlistItem[]> {
  const data = await api<{ items: WatchlistItem[] }>("post", {
    code: getListCode(),
    action: "add",
    item,
  });
  return data.items ?? [];
}

export async function removeFromList(item: Omit<WatchlistItem, "addedAt">): Promise<WatchlistItem[]> {
  const data = await api<{ items: WatchlistItem[] }>("post", {
    code: getListCode(),
    action: "remove",
    item,
  });
  return data.items ?? [];
}
