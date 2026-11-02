"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { REGIONS } from "@/lib/regions";

export function RegionSelect({ value }: { value: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-foreground/60">
      <span>Region</span>
      <select
        value={value}
        disabled={pending}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("region", event.target.value);
          startTransition(() => router.push(`?${params.toString()}`));
        }}
        className="h-9 rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-foreground outline-none transition focus:border-sky-400/60"
        aria-label="Streaming availability region"
      >
        {REGIONS.map((region) => (
          <option key={region.code} value={region.code} className="bg-slate-900">
            {region.name}
          </option>
        ))}
      </select>
    </label>
  );
}
