import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { emitEvent } from "@/lib/automation/events";
import { chunk } from "@/lib/utils";

type Client = SupabaseClient<Database>;
type QualificationInsert = Database["public"]["Tables"]["qualifications"]["Insert"];

// Past this many UUIDs, a single .in() query string risks the ~16KB header
// limit (see lib/utils.ts's chunk comment).
const IN_CHUNK_SIZE = 150;

// Fetches every qualification for a batch of leads/deals in one query, so a
// kanban page can compute the "pending qualification" badge (blueprint
// §2.4) for a whole column without one query per card.
export async function listQualificationsFor(db: Client, entidadeTipo: "lead" | "deal", entidadeIds: string[]) {
  if (entidadeIds.length === 0) return [];
  const pages = await Promise.all(
    chunk(entidadeIds, IN_CHUNK_SIZE).map(async (page) => {
      const { data, error } = await db.from("qualifications").select("*").eq("entidade_tipo", entidadeTipo).in("entidade_id", page);
      if (error) throw error;
      return data ?? [];
    })
  );
  return pages.flat();
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
