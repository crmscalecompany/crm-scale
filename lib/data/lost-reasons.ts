import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

export async function listLostReasons(db: Client, categoria: "sdr" | "closer") {
  const { data, error } = await db.from("lost_reasons").select("*").eq("categoria", categoria).eq("ativo", true).order("descricao");
  if (error) throw error;
  return data ?? [];
}
