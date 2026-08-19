import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

// Batched lookup for the lead detail panel's "Atribuição de marketing"
// section (campanha/público/criativo/fbclid/lead_id_ads) — one row per
// lead, so the panel can show it without a query per lead.
export async function listAttributionByLeadIds(db: Client, leadIds: string[]) {
  if (leadIds.length === 0) return [];
  const { data, error } = await db.from("lead_attribution").select("*").in("lead_id", leadIds);
  if (error) throw error;
  return data ?? [];
}
