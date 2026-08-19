import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

// Monday stores SDR/Closer/Vendedor as free-text dropdown labels, not FKs.
// public.users.id is itself a foreign key to auth.users(id) — the standard
// Supabase profile-table pattern (see supabase/migrations/*_niches_users) —
// so, unlike niches or lost_reasons, migration CANNOT fabricate a
// placeholder users row for an unrecognized name: there's no auth identity
// to attach it to.
//
// So this only ever resolves names that already match an existing
// public.users row (created ahead of time via scripts/seed-test-users.ts or
// a real admin invite). Anything unresolved stays NULL on
// owner_sdr_id/closer_id/vendedor_id — the raw name is preserved in the
// row's raw_monday jsonb so nothing is silently lost — and is collected
// here for the migration summary so an admin can reconcile it by hand.
const cache = new Map<string, string | null>();
export const unresolvedNames = new Set<string>();

export async function resolveUserByName(db: Client, rawName: string | null): Promise<string | null> {
  if (!rawName || !rawName.trim()) return null;
  const trimmed = rawName.trim();
  const key = trimmed.toLowerCase();

  if (cache.has(key)) return cache.get(key) ?? null;

  const { data, error } = await db.from("users").select("id").ilike("nome", trimmed).maybeSingle();
  if (error) throw error;

  if (!data) {
    unresolvedNames.add(trimmed);
    cache.set(key, null);
    return null;
  }

  cache.set(key, data.id);
  return data.id;
}
