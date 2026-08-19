import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;
type MeetingInsert = Database["public"]["Tables"]["meetings"]["Insert"];
type MeetingStatus = Database["public"]["Tables"]["meetings"]["Row"]["status"];

export async function createMeeting(db: Client, input: MeetingInsert) {
  const { data, error } = await db.from("meetings").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

// Batched, at most one meeting per deal — same "one deal per lead" model
// this codebase already assumes elsewhere (see lib/data/deals.ts's
// listDealsByLeadIds comment). A reschedule mutates the existing row's
// status in place rather than creating a new one; if real reschedule
// history ever matters, that's a separate later decision.
export async function listMeetingsByDealIds(db: Client, dealIds: string[]) {
  const map = new Map<string, Database["public"]["Tables"]["meetings"]["Row"]>();
  if (dealIds.length === 0) return map;

  const { data, error } = await db.from("meetings").select("*").eq("referencia_tipo", "deal").in("referencia_id", dealIds);
  if (error) throw error;

  for (const meeting of data ?? []) map.set(meeting.referencia_id, meeting);
  return map;
}

export async function updateMeetingStatus(db: Client, id: string, status: MeetingStatus) {
  const { data, error } = await db.from("meetings").update({ status }).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}
