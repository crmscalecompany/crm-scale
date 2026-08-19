import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, UserRole } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

// Reads the caller's own public.users row (nome/papel) for the currently
// authenticated session. Returns null if there's no session or no matching
// profile row yet (e.g. an auth user created without the seed script).
export async function getCurrentUserProfile(supabase: Client) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return data;
}

// Used to populate SDR/closer pickers and to resolve owner_sdr_id/closer_id
// -> display name on kanban cards without a query per card.
export async function listUsersByRole(db: Client, papel: UserRole) {
  const { data, error } = await db.from("users").select("*").eq("papel", papel).eq("ativo", true).order("nome");
  if (error) throw error;
  return data ?? [];
}

// public.users has no email column (see Week 1 notes) — it lives on
// auth.users, only reachable via the admin API. Used to resolve a closer's
// email as a Google Calendar attendee when booking a meeting.
export async function getUserEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;
  return data.user?.email ?? null;
}
