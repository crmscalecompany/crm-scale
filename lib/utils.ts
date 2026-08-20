import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// PostgREST inlines .in("col", ids) as a literal query-string list — past a
// few hundred UUIDs the request URL blows Node's ~16KB header limit
// (UND_ERR_HEADERS_OVERFLOW), which is exactly what a full month of leads
// (400+) hits when lib/data/*'s batched lookups (.in("lead_id", leadIds))
// run unchunked. Split into pages under that limit instead.
export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
