import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

export async function listNiches(db: Client) {
  const { data, error } = await db.from("niches").select("*").eq("ativo", true).order("nome");
  if (error) throw error;
  return data ?? [];
}
