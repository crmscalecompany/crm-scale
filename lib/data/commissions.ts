import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;
type CommissionStatus = Database["public"]["Enums"]["commission_status"];

// RLS scopes what comes back: admin sees every commission, a seller sees
// only the ones tied to a deal_product where they're the vendedor.
export async function listCommissions(db: Client) {
  const { data, error } = await db.from("commissions").select("*").order("calculado_em", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateCommissionStatus(db: Client, id: string, status: CommissionStatus) {
  const { data, error } = await db.from("commissions").update({ status }).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}
