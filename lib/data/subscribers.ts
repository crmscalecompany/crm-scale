import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

export interface Subscriber {
  email: string;
  nome: string;
}

// Audience for "Avisar inscritos" (lib/actions/subscribers.ts) — every lead
// captured with this `tipo` (set by the site's /api/v1/webhooks/{cases,blog}
// routes) that has an email and hasn't opted out. A person can have more
// than one lead row under the same tipo (e.g. submitted the form twice), so
// results are deduped by lowercased email — Resend gets one send per
// address, never per row.
export async function listSubscribers(db: Client, tipo: string): Promise<Subscriber[]> {
  const { data, error } = await db.from("leads").select("nome, email").eq("tipo", tipo).eq("email_opt_out", false).not("email", "is", null);
  if (error) throw error;

  const byEmail = new Map<string, Subscriber>();
  for (const row of data ?? []) {
    if (!row.email) continue;
    const key = row.email.trim().toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, { email: row.email.trim(), nome: row.nome });
  }
  return [...byEmail.values()];
}

// Global opt-out, matched by email (case-insensitive) across every lead row
// — a person who signed up for both Cases and Newsletter only ever sees one
// "unsubscribe" concept, not two independent toggles. Uses the admin client
// at the call site (app/unsubscribe/page.tsx) since the visitor clicking
// this link has no CRM session.
export async function optOutEmail(db: Client, email: string): Promise<void> {
  const { error } = await db.from("leads").update({ email_opt_out: true }).ilike("email", email.trim());
  if (error) throw error;
}
