import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;
type CommissionRuleInsert = Database["public"]["Tables"]["commission_rules"]["Insert"];

// Rules are versioned by vigente_desde rather than edited in place — to
// change a percentage, add a new row with a later vigente_desde instead of
// mutating the old one, so history of what applied when is preserved (see
// lib/commissions/calculate.ts, which picks the most recent row whose
// vigente_desde has passed). RLS scopes what a caller actually gets back:
// admin sees every rule, a seller sees only their own vendedor_id override.
export async function listCommissionRules(db: Client) {
  const { data, error } = await db.from("commission_rules").select("*").order("vigente_desde", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCommissionRule(db: Client, input: CommissionRuleInsert) {
  const { data, error } = await db.from("commission_rules").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteCommissionRule(db: Client, id: string) {
  const { error } = await db.from("commission_rules").delete().eq("id", id);
  if (error) throw error;
}
