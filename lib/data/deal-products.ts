import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;
type DealProductInsert = Database["public"]["Tables"]["deal_products"]["Insert"];

// One row per line item on a deal — the level commissions.deal_product_id
// actually attaches to (a deal itself has no vendedor_id, only its
// products do, since one deal could in principle involve more than one
// seller). Today the only writer is closeDealAction (lib/actions/deals.ts),
// which creates exactly one row per closed deal.
export async function createDealProduct(db: Client, input: DealProductInsert) {
  const { data, error } = await db.from("deal_products").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

// Batched lookup — lets the commissions view resolve
// commissions.deal_product_id -> produto/valor/vendedor with one query.
export async function listDealProductsByIds(db: Client, ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await db.from("deal_products").select("*").in("id", ids);
  if (error) throw error;
  return data ?? [];
}
