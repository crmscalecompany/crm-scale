import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

export async function listNiches(db: Client) {
  const { data, error } = await db.from("niches").select("*").eq("ativo", true).order("nome");
  if (error) throw error;
  return data ?? [];
}

// Backs the leads table's inline "Nicho" combobox (components/leads/
// editable-cell.tsx) — typing a name that doesn't exist yet creates it.
// `nome` is unique at the DB level; on a collision, treat it as "select the
// existing one" instead of surfacing a raw constraint-violation error,
// since from the UI's perspective typing an existing name should just pick
// it.
export async function createNiche(db: Client, nome: string) {
  const trimmed = nome.trim();
  const { data, error } = await db.from("niches").insert({ nome: trimmed }).select("id, nome").single();
  if (error) {
    if (error.code === "23505") {
      const { data: existing, error: findError } = await db.from("niches").select("id, nome").eq("nome", trimmed).single();
      if (findError) throw findError;
      return existing;
    }
    throw error;
  }
  return data;
}
