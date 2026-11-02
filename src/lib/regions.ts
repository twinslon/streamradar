/** Client-safe constants — no server-only imports here. */

export const REGIONS: ReadonlyArray<{ code: string; name: string }> = [
  { code: "BG", name: "Bulgaria" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "RO", name: "Romania" },
  { code: "GR", name: "Greece" },
  { code: "TR", name: "Türkiye" },
  { code: "SE", name: "Sweden" },
];

export function normalizeRegion(value: unknown): string {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{2}$/.test(raw) ? raw : "BG";
}
