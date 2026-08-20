import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { chunk } from "@/lib/utils";

type Client = SupabaseClient<Database>;
type LeadAttributionInsert = Database["public"]["Tables"]["lead_attribution"]["Insert"];

// Past this many UUIDs, a single .in() query string risks the ~16KB header
// limit (see lib/utils.ts's chunk comment).
const IN_CHUNK_SIZE = 150;

// Batched lookup for the lead detail panel's "Atribuição de marketing"
// section (campanha/público/criativo/fbclid/lead_id_ads) — one row per
// lead, so the panel can show it without a query per lead.
export async function listAttributionByLeadIds(db: Client, leadIds: string[]) {
  if (leadIds.length === 0) return [];
  const pages = await Promise.all(
    chunk(leadIds, IN_CHUNK_SIZE).map(async (page) => {
      const { data, error } = await db.from("lead_attribution").select("*").in("lead_id", page);
      if (error) throw error;
      return data ?? [];
    })
  );
  return pages.flat();
}

// Site webhooks that capture UTMs (e.g. app/api/v1/webhooks/live) call this
// right after createLead — kept as a separate insert rather than folded into
// createLead itself since most lead sources (Monday migration, manual
// creation) have no attribution to record at all.
export async function createLeadAttribution(db: Client, input: LeadAttributionInsert) {
  const { data, error } = await db.from("lead_attribution").insert(input).select("*").single();
  if (error) throw error;
  return data;
}
