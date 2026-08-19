import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, QualificationEtapa } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

export async function listQualificationReasons(db: Client, etapa: QualificationEtapa) {
  const { data, error } = await db.from("qualification_reasons").select("*").eq("etapa", etapa).eq("ativo", true).order("codigo");
  if (error) throw error;
  return data ?? [];
}
