import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;
type LeadUpdateInsert = Database["public"]["Tables"]["lead_updates"]["Insert"];
type LeadUpdateAttachmentInsert = Database["public"]["Tables"]["lead_update_attachments"]["Insert"];

// Newest first — the modal reads top-to-bottom as "what happened most
// recently", not a chronological diary. Embeds the author's name (users)
// and every attachment in one query rather than N+1ing per update.
export async function listUpdatesByLeadId(db: Client, leadId: string) {
  const { data, error } = await db
    .from("lead_updates")
    .select("*, autor:users(nome), lead_update_attachments(*)")
    .eq("lead_id", leadId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createLeadUpdate(db: Client, input: LeadUpdateInsert) {
  const { data, error } = await db.from("lead_updates").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function createLeadUpdateAttachment(db: Client, input: LeadUpdateAttachmentInsert) {
  const { data, error } = await db.from("lead_update_attachments").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

// Admin-only (see the lead_updates_delete/lead_update_attachments_delete
// RLS policies) — fixing a mistake, not a normal edit flow; the log is
// otherwise append-only. Storage objects for this update's attachments are
// deleted by the caller (lib/actions/lead-updates.ts) before this, since
// that needs the storage_path values this delete would otherwise cascade
// away first.
export async function deleteLeadUpdate(db: Client, id: string) {
  const { error } = await db.from("lead_updates").delete().eq("id", id);
  if (error) throw error;
}
