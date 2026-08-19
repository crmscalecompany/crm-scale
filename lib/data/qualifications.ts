import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { emitEvent } from "@/lib/automation/events";

type Client = SupabaseClient<Database>;
type QualificationInsert = Database["public"]["Tables"]["qualifications"]["Insert"];

// Fetches every qualification for a batch of leads/deals in one query, so a
// kanban page can compute the "pending qualification" badge (blueprint
// §2.4) for a whole column without one query per card.
export async function listQualificationsFor(db: Client, entidadeTipo: "lead" | "deal", entidadeIds: string[]) {
  if (entidadeIds.length === 0) return [];
  const { data, error } = await db.from("qualifications").select("*").eq("entidade_tipo", entidadeTipo).in("entidade_id", entidadeIds);
  if (error) throw error;
  return data ?? [];
}

export async function createQualification(db: Client, input: QualificationInsert) {
  const { data, error } = await db.from("qualifications").insert(input).select("*").single();
  if (error) throw error;

  await emitEvent({
    type: "qualification.created",
    entidade_tipo: "qualification",
    entidade_id: data.id,
    payload: { qualification: data },
    occurred_at: new Date().toISOString(),
  });

  return data;
}
